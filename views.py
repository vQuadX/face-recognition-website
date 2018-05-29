from datetime import timezone, datetime

import requests
from flask import render_template, Blueprint, request, jsonify, abort
from requests import RequestException

from auth import authorize
from forms import AddPersonForm, AddFaceForm
from models import Person, db
from settings import FACE_RECOGNITION_SERVER
from utils import format_datetime

bp = Blueprint('views', __name__)
recognition_api = authorize()


@bp.route('/')
def index():
    return render_template('index.html')


@bp.route('/identification', methods=['GET', 'POST'])
def identification():
    image = None
    if request.method == 'GET':
        image_url = request.args.get('image_url')
        if image_url:
            try:
                img_data = requests.get(image_url).content
            except RequestException:
                return jsonify({'error': 'invalid image URL'})
            else:
                image = img_data
        else:
            context = {
                'init_js_script': 'Identification',
                'recognition_server': FACE_RECOGNITION_SERVER
            }
            return render_template('identification.html', **context)
    elif request.method == 'POST':
        image = request.files.get('image')
        if image:
            image = image.stream
        else:
            return jsonify({'error': 'Image is not specified'})

    response = recognition_api.post(
        f'http://{FACE_RECOGNITION_SERVER}/identify-faces',
        files={
            'image': image
        }
    ).json()
    persons = response.get('persons')
    if persons:
        for person in persons:
            person_id = person['id']
            if person_id:
                person_info = Person.query.get(person_id)
                if person_info:
                    person_info = person_info.to_json()
                    del person_info['id']
                    registered = person_info['registered']
                    person_info['registered'] = {
                        'utc': registered.replace(tzinfo=timezone.utc).timestamp(),
                        'formatted': format_datetime(registered)
                    }
                person['info'] = person_info
        return jsonify(response)


@bp.route('/getPersonById/<string:uuid>')
def get_user_by_id(uuid):
    person = Person.query.get(uuid)
    return jsonify(person.to_json() if person else {
        'error': f'Person with id "{uuid}" not found'
    })


@bp.route('/verification', methods=['GET', 'POST'])
def verification():
    if request.method == 'GET':
        image_url = request.args.get('image_url')
        if image_url:
            try:
                img_data = requests.get(image_url).content
            except RequestException:
                return jsonify({'error': 'invalid image URL'})

            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/recognize-faces',
                files={
                    'image': img_data
                }
            ).json()
            return jsonify(response)
        context = {'init_js_script': 'Verification'}
        return render_template('verification.html', **context)
    elif request.method == 'POST':
        if request.is_json:
            face_embeddings = request.json.get('face_embeddings')
            if face_embeddings:
                response = recognition_api.post(
                    f'http://{FACE_RECOGNITION_SERVER}/verify-embeddings',
                    json=face_embeddings
                ).json()
                return jsonify(response)

        image = request.files.get('image')
        if image:
            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/recognize-faces',
                files={
                    'image': image.stream
                }
            ).json()
            return jsonify(response)
        else:
            return jsonify({'error': 'Image is not specified'})


@bp.route('/add-person', methods=['GET', 'POST'])
def add_person():
    form = AddPersonForm()
    if form.validate_on_submit():
        person_email = form.email.data
        person_registered = bool(Person.query.filter_by(email=form.email.data).first())
        if person_registered:
            # flash(('danger', f'Пользователь с email "<strong>{person_email}</strong>" уже зарегистрирован'))
            return jsonify({
                'status': 'error',
                'message': f'Пользователь с email "<strong>{person_email}</strong>" уже зарегистрирован',
            })
        else:
            image = form.image.data
            if not image:
                return jsonify({
                    'status': 'error',
                    'error': 'Image is not specified'
                })
            if isinstance(image, str):
                try:
                    image = requests.get(image).content
                except RequestException:
                    return jsonify({
                        'status': 'error',
                        'error': 'Неверно указан URL'
                    })

            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/add-person',
                files={
                    'image': image
                }
            ).json()
            if response['status'] == 'success':
                first_name = form.first_name.data
                last_name = form.last_name.data
                person_id = response['person_id']
                person = Person(
                    id=person_id,
                    email=person_email,
                    first_name=first_name,
                    last_name=last_name,
                    additional_info=form.addition_info.data.strip() or None
                )
                db.session.add(person)
                db.session.commit()
                return jsonify({
                    'status': 'success',
                    'message': f'<strong>{first_name} {last_name}</strong> успешно добавлен',
                })
                # flash(('success', f'{first_name} {last_name} успешно добавлен'))
                # form = AddPersonForm()
            else:
                # flash(('danger', response['error']))
                return jsonify({
                    'status': 'error',
                    'message': response['error'],
                })
    context = {
        'init_js_script': 'AddPerson',
        'recognition_server': FACE_RECOGNITION_SERVER,
        'form': form
    }
    return render_template('add_person.html', **context)


@bp.route('/add-face', methods=['GET', 'POST'])
def add_face():
    form = AddFaceForm()
    if form.validate_on_submit():
        person_email = form.email.data
        person = Person.query.filter_by(email=form.email.data).first()
        if person:
            person_id = person.id
            image = form.image.data
            if not image:
                return jsonify({
                    'status': 'error',
                    'error': 'Image is not specified'
                })
            if isinstance(image, str):
                try:
                    image = requests.get(image).content
                except RequestException:
                    return jsonify({
                        'status': 'error',
                        'error': 'Неверно указан URL'
                    })

            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/add-face/{person_id}',
                files={
                    'image': image
                }
            ).json()
            if response['status'] == 'success':
                person.updated = datetime.now()
                person.faces = person.faces + 1
                db.session.commit()
                return jsonify({
                    'status': 'success',
                    'message': f'Лицо успешно добавлено для {person.first_name} {person.last_name}',
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': response['error']
                })

        else:
            return jsonify({
                'status': 'error',
                'message': f'Пользователь с email "<strong>{person_email}</strong>" не зарегистрирован',
            })

    context = {
        'init_js_script': 'AddFace',
        'recognition_server': FACE_RECOGNITION_SERVER,
        'form': form
    }
    return render_template('add_face.html', **context)


@bp.route('/person/<string:email>')
def person(email):
    person = Person.query.filter_by(email=email).first()
    if person:
        person_info = person.to_json()
        if person_info:
            registered = person_info['registered']
            person_info['registered'] = {
                'utc': registered.replace(tzinfo=timezone.utc).timestamp(),
                'formatted': format_datetime(registered)
            }
        images = recognition_api.get(
            f'http://{FACE_RECOGNITION_SERVER}/person-images/{person.id}'
        ).json()['images']
        context = {
            'person': person_info,
            'images': [f'http://{FACE_RECOGNITION_SERVER}/{image}' for image in images]
        }
        return render_template('person.html', **context)
    else:
        abort(404)


@bp.route('/find-faces', methods=['GET', 'POST'])
def find_faces():
    if request.method == 'GET':
        image_url = request.args.get('image_url')
        if image_url:
            try:
                img_data = requests.get(image_url).content
            except RequestException:
                return jsonify({'error': 'invalid image URL'})

            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/find-faces',
                files={
                    'image': img_data
                }
            ).json()
            return jsonify(response)
        return render_template('verification.html')
    elif request.method == 'POST':
        image = request.files.get('image')
        if image:
            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/find-faces',
                files={
                    'image': image.stream
                }
            ).json()
            return jsonify(response)
        else:
            return jsonify({'error': 'image file required'})
