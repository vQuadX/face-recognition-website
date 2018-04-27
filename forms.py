from flask_wtf import FlaskForm
from flask_wtf.file import FileRequired
from wtforms import StringField, TextAreaField, FileField
from wtforms.fields.html5 import EmailField
from wtforms.validators import DataRequired, Email


class AddPersonForm(FlaskForm):
    image = FileField(validators=[FileRequired()])
    email = EmailField('Электронная почта', [DataRequired(), Email()])
    first_name = StringField('Имя', [DataRequired()])
    last_name = StringField('Фамилия', [DataRequired()])
    addition_info = TextAreaField('Дополнительная информация')
