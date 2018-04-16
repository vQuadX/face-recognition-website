$.FaceRecognizer.Verification = {
    init: function () {
        $.FaceRecognizer.image.init($('#verification-container'));
        this.utils = $.FaceRecognizer.utils;
        this.image = $.FaceRecognizer.image;
        this.result = $('#result');
        this.faces = {
            'left': null,
            'right': null
        };

        const that = $.FaceRecognizer.Verification;
        $('#open-left-image').on('change', function (e) {
                const file = e.target.files[0];
                $.FaceRecognizer.image.openFromFile(file, 'left',
                    function (src, ratio, offset, ctx) {
                        that.highlightAndCompareFaces(that.sendImageFile(file), ratio, offset, ctx, 'left')
                    })
            }
        );
        $('#open-right-image').on('change', function (e) {
                const file = e.target.files[0];
                $.FaceRecognizer.image.openFromFile(file, 'right',
                    function (src, ratio, offset, ctx) {
                        that.highlightAndCompareFaces(that.sendImageFile(file), ratio, offset, ctx, 'right')
                    })
            }
        );
        $('#open-left-image-url').on('click', function () {
            return $.FaceRecognizer.image.openFromURL('left', function (src, ratio, offset, ctx) {
                that.highlightAndCompareFaces(that.sendImageURL(src), ratio, offset, ctx, 'left')
            })
        });
        $('#open-right-image-url').on('click', function () {
            return $.FaceRecognizer.image.openFromURL('right', function (src, ratio, offset, ctx) {
                that.highlightAndCompareFaces(that.sendImageURL(src), ratio, offset, ctx, 'right')
            })
        });
    },
    sendImageURL: function (url) {
        return $.ajax({
            url: 'verification',
            method: 'GET',
            data: {'image_url': url}
        });
    },
    sendImageFile: function (file) {
        const data = new FormData();
        data.append('image', file);
        return $.ajax({
            url: 'verification',
            method: 'POST',
            data: data,
            cache: false,
            contentType: false,
            processData: false
        });
    },
    sendFaceEmbeddings(embeddings) {
        return $.ajax({
            url: 'verification',
            method: 'POST',
            data: JSON.stringify({'face_embeddings': embeddings}),
            dataType: 'json',
            contentType: "application/json; charset=utf-8"
        })
    },
    highlightAndCompareFaces: function (promise, ratio, offset, ctx, side) {
        promise.done(data => {
                const found_faces = data['found_faces'];
                if (found_faces) {
                    let scaledRectangles = this.utils.scaleRectangles(data['faces'].map(f => f['area']), ratio, offset);
                    this.image.drawFaceRectangles(ctx, scaledRectangles);
                }
                if (found_faces === 1) {
                    this.faces[side] = data['faces'][0]['embeddings'];
                    if (this.faces.left && this.faces.right) {
                        this.sendFaceEmbeddings([this.faces.left, this.faces.right]).done(data => {
                            const distance = data['distance'].toFixed(4);
                            let result = '';
                            if (distance <= 0.6) {
                                result = 'оба портрета принадлежат одному человеку';
                            } else {
                                result = 'портреты принадлежат разным людям'
                            }
                            this.result.removeClass('alert-danger alert-warning');
                            this.result.addClass('alert-secondary');
                            this.result.html(`Результат проверки: <strong>${result}</strong>. Расстояние дескрипторов — <strong>${distance}</strong>`)
                        })
                    }
                } else if (found_faces > 1) {
                    this.result.removeClass('alert-secondary alert-danger');
                    this.result.addClass('alert-warning');
                    this.result.html(`На изображении найдено несколько портретов (${found_faces}). Загрузите изображение с одним портретом`)
                } else {
                    this.result.removeClass('alert-secondary alert-warning');
                    this.result.addClass('alert-danger');
                    this.result.html('На изображении не найдено портретов')
                }
            }
        );
    }
};

