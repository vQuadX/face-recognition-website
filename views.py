from flask import render_template, Blueprint


bp = Blueprint('views', __name__)


@bp.route('/')
def index():
    return render_template('index.html')
