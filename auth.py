import requests
from passlib.handlers.pbkdf2 import pbkdf2_sha256
from requests import Session

from settings import FACE_RECOGNITION_API_LOGIN, FACE_RECOGNITION_API_PASSWORD, FACE_RECOGNITION_SERVER


def authorize():
    session = Session()
    try:
        auth_response = session.post(
            f'http://{FACE_RECOGNITION_SERVER}/auth',
            json={
                'username': FACE_RECOGNITION_API_LOGIN,
                'password': pbkdf2_sha256.hash(FACE_RECOGNITION_API_PASSWORD)
            })
    except requests.ConnectionError:
        print('Server authentication error')
    else:
        access_token = auth_response.json()['jwt']
        session.headers.update({'Authorization': f'Bearer {access_token}'})
    return session
