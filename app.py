import os

import click
from flask import Flask, url_for
from flask_mail import Mail
from flask_security import Security, SQLAlchemySessionUserDatastore
from models import db, User, Role
from views import bp

app = Flask(__name__)
app.register_blueprint(bp)
app.config.from_pyfile('settings.py')
user_datastore = SQLAlchemySessionUserDatastore(db, User, Role)
security = Security(app, user_datastore)
mail = Mail(app)
db.init_app(app)


@app.cli.command()
def initdb():
    db.create_all(app=app)
    click.echo('All tables are successfully created in the database')


@app.context_processor
def base_js():
    frontend = app.config.get('FRONTEND')
    return {'base_js': frontend.get('client_js') or [] if frontend else []}


@app.context_processor
def override_url_for():
    return {'url_for': dated_url_for}


def dated_url_for(endpoint, **values):
    if endpoint == 'static':
        filename = values.get('filename', None)
        if filename:
            file_path = os.path.join(app.root_path,
                                     endpoint, filename)
            values['q'] = int(os.stat(file_path).st_mtime)
    return url_for(endpoint, **values)


if __name__ == '__main__':
    app.run()
