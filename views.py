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

            return jsonify(requests.post(
                f'{FACE_RECOGNITION_SERVER}/find-faces',
                files={
                    'image': img_data
                }
            ).json())
        return render_template('verification.html')
    elif request.method == 'POST':
        image = request.files['image']
        return jsonify(requests.post(
            f'{FACE_RECOGNITION_SERVER}/find-faces',
            files={
                'image': image.stream
            }
        ).json())
