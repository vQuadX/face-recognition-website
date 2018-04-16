import requests
from flask import render_template, Blueprint, request, jsonify
from requests import RequestException

from settings import FACE_RECOGNITION_SERVER

bp = Blueprint('views', __name__)


@bp.route('/')
def index():
    return render_template('index.html')


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
