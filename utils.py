import calendar
import locale
from datetime import datetime, timedelta, date

locale.setlocale(locale.LC_ALL, 'RU')

MONTHS = tuple(m.lower() for m in calendar.month_name[1:])
MONTHS_GENITIVE = tuple((m[:-1] + 'я') if m[-1] in ('ь', 'й') else m + 'а' for m in MONTHS)


def format_datetime(dt: datetime, capitalize=True):
    _date = dt.date()
    _time = dt.time().strftime('%H:%M')
    today = date.today()
    if _date == today:
        _datetime = f'сегодня {_time}'
    elif _date == today - timedelta(1):
        _datetime = f'вчера {_time}'
    else:
        _datetime = f'{_date.day} {MONTHS_GENITIVE[_date.month - 1]}, {_time}'
    return _datetime.capitalize() if capitalize else _datetime
