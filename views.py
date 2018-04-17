import requests
from flask import render_template, Blueprint, request, jsonify
from requests import RequestException

from auth import authorize
from models import Person
from settings import FACE_RECOGNITION_SERVER

bp = Blueprint('views', __name__)
recognition_api = authorize()


@bp.route('/')
def index():
    return render_template('index.html')


@bp.route('/identification', methods=['GET', 'POST'])
def identification():
    if request.method == 'GET':
        image_url = request.args.get('image_url')
        if image_url:
            try:
                img_data = requests.get(image_url).content
            except RequestException:
                return jsonify({'error': 'invalid image URL'})

            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/identify-faces',
                files={
                    'image': img_data
                }
            ).json()
            return jsonify(response)

        context = {
            'init_js_script': 'Identification',
            'recognition_server': FACE_RECOGNITION_SERVER
        }
        return render_template('identification.html', **context)
    elif request.method == 'POST':
        image = request.files.get('image')
        if image:
            response = recognition_api.post(
                f'http://{FACE_RECOGNITION_SERVER}/identify-faces',
                files={
                    'image': image.stream
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
                        person['info'] = person_info
            return jsonify(response)
        else:
            return jsonify({'error': 'image file required'})


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
                    f'http://{FACE_RECOGNITION_SERVER}/compare-embeddings',
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
            return jsonify({'error': 'image file required'})
