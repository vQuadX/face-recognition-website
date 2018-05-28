from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, HiddenField
from wtforms.fields.html5 import EmailField
from wtforms.validators import DataRequired, Email


class AddPersonForm(FlaskForm):
    image = HiddenField()
    email = EmailField('Электронная почта', [DataRequired(), Email()])
    first_name = StringField('Имя', [DataRequired()])
    last_name = StringField('Фамилия', [DataRequired()])
    addition_info = TextAreaField('Дополнительная информация')


class AddFaceForm(FlaskForm):
    image = HiddenField()
    email = EmailField('Электронная почта', [DataRequired(), Email()])
