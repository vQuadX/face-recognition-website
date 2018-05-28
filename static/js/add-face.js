$.FaceRecognizer.AddFace = {
    init: function () {
        this.container = $('#identification-container');
        $.FaceRecognizer.image.init(this.container);
        this.canvas = this.container.find('.face-canvas').get(0);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineWidth = 3;
        this.utils = $.FaceRecognizer.utils;
        this.image = $.FaceRecognizer.image;

        this.video = $('#webcam').get(0);
        this.socket = new WebSocket(`ws://${window.recognition_server}/ws`);
        this.streamStarted = false;
        this.constraints = {
            video: {
                width: {
                    exact: 640
                },
                height: {
                    exact: 479
                }
            },
            audio: false
        };

        this.files = [];
        this.personImage = null;

        let that = this;
        this.addFaceForm = $('#add-face-form');
        $('#add-face-btn').on('click', function () {
            if (that.addFaceForm.get(0).checkValidity()) {
                that.sendForm().done(data => {
                    let alertType = data.status === 'success' ? 'success' : 'danger';
                    $('#alert').html(`<div class="alert alert-${alertType}" style="min-height:50px;" role="alert" id="result">${data.message}</div>`);
                    $('#person-email').val('')
                });
            } else {
                $('<input type="submit">').hide().appendTo(that.addFaceForm).click().remove();
            }
        });
        $('#open-image').on('change', function (e) {
                that.files = e.target.files;
                $.FaceRecognizer.image.openFromFile(that.files[0], null,
                    function (src, ratio, offset, ctx) {
                        that.personImage = that.files[0];
                        that.highlightFaces(that.sendImageFile(that.files[0]), ratio, offset, ctx)
                    });
            }
        );
        $('#open-image-url').on('click', function () {
            return $.FaceRecognizer.image.openFromURL(null,
                function (src, ratio, offset, ctx) {
                    that.personImage = src;
                    that.highlightFaces(that.sendImageURL(src), ratio, offset, ctx)
                })
        });

        let faces;
        this.socket.onmessage = function (event) {
            let data = JSON.parse(event.data);
            if (data.hasOwnProperty('persons')) {
                faces = data.persons.map(p => p.area);
            }
        };

        this.video.addEventListener('play', function () {
            let addFace = $.FaceRecognizer.AddFace;
            addFace.socket.send(JSON.stringify({'mode': 'face-detection'}));
            let that = this;
            let frames = 0;
            (function loop() {
                if (!that.paused && !that.ended) {
                    addFace.ctx.drawImage(that, 0, 0);
                    if (faces) {
                        $.FaceRecognizer.image.drawFaceRectangles(addFace.ctx, faces);
                    }
                    if (frames % 3 === 0) {
                        addFace.canvas.toBlob(blob => {
                            addFace.socket.send(blob);
                        }, 'image/jpeg', 0.8);
                    }
                    frames++;
                    setTimeout(loop, 1000 / 27);
                }
            })();
        }, 0);

        let imageCapture;

        function success(stream) {
            that.video.srcObject = stream;
            const track = stream.getVideoTracks()[0];
            imageCapture = new ImageCapture(track);
        }


        function stopStream() {
            imageCapture.grabFrame().then(bitmap => {
                imageCapture.takePhoto().then(blob => {
                    that.highlightFaces(that.sendImageFile(blob), 1, {x: 0, y: 0}, that.ctx);
                    that.ctx.drawImage(bitmap, 0, 0);
                    that.personImage = new File([blob], 'person.jpg');
                    let tracks = that.video.srcObject.getTracks();
                    tracks.forEach(function (track) {
                        track.stop();
                    });
                    that.video.srcObject = null;
                });
            });
            faces = null;
        }

        $('#open-webcam').click(function () {
            if (!that.streamStarted) {
                that.personFaces = [];
                that.perosonsInfo = [];
                navigator.mediaDevices.getUserMedia(that.constraints).then(success).catch(error => console.error(error));
                that.video.play();
                that.streamStarted = true;
            } else {
                that.streamStarted = false;
                stopStream();
            }
        });
    },
    sendImageFile: function (imageFile) {
        const data = new FormData();
        data.append('image', imageFile);
        return $.ajax({
            url: 'find-faces',
            method: 'POST',
            data: data,
            cache: false,
            contentType: false,
            processData: false
        });
    },
    sendImageURL: function (url) {
        return $.ajax({
            url: 'find-faces',
            method: 'GET',
            data: {'image_url': url}
        });
    },
    highlightFaces: function (promise, ratio, offset, ctx) {
        promise.done(data => {
                let faces = this.utils.scaleRectangles(data['faces'], ratio, offset);
                this.image.drawFaceRectangles(ctx, faces);
                $('#add-face-btn').prop('disabled', faces.length !== 1);
                if (faces.length > 1) {
                    this.alert('warning', `На изображении найдено несколько портретов (${faces.length}). Загрузите изображение с одним портретом`)
                } else if (faces.length === 0) {
                    this.alert('danger', 'На изображении не найдено портретов')
                } else {
                    $('#alert').find('.alert').remove();
                }
            }
        );
    },
    sendForm: function () {
        let formatData = new FormData();
        formatData.append('image', this.personImage);
        let formData = this.addFaceForm.serializeArray();
        $(formData).each(function (index, obj) {
            formatData.append(obj.name, obj.value);
        });
        return $.ajax({
            type: 'POST',
            url: 'add-face',
            data: formatData,
            processData: false,
            cache: false,
            contentType: false
        });
    },
    alert: function (alertType, message) {
        $('#alert').html(`<div class="alert alert-${alertType}" style="min-height:50px;" role="alert" id="result">${message}</div>`);
    }
};