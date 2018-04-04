import requests
from flask import render_template, Blueprint, request, jsonify

from settings import FACE_RECOGNITION_SERVER

bp = Blueprint('views', __name__)


@bp.route('/')
def index():
    return render_template('index.html')


@bp.route('/verification', methods=['GET', 'POST'])
def verification():
    if request.method == 'GET':
        return render_template('verification.html')
    elif request.method == 'POST':
        image = request.files['image']
        return jsonify(requests.post(
            f'{FACE_RECOGNITION_SERVER}/find-faces',
            files={
                'image': image.stream
            }
        ).json())
