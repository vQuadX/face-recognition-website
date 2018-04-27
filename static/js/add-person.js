$.FaceRecognizer.AddPerson = {
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
        this.addPersonForm = $('#add-person-form');
        $('#submit-person-btn').on('click', function () {
            if (that.addPersonForm.get(0).checkValidity()) {
                that.sendForm.done(data => console.log(data))
            } else {
                $('<input type="submit">').hide().appendTo(that.addPersonForm).click().remove();
            }
        });
        $('#open-image').on('change', function (e) {
                that.files = e.target.files;
                $.FaceRecognizer.image.openFromFile(that.files[0], null,
                    function (src, ratio, offset, ctx) {
                        that.highlightFaces(that.sendImageFile(that.files[0]), ratio, offset, ctx)
                    });
            }
        );
        $('#open-image-url').on('click', function () {
            return $.FaceRecognizer.image.openFromURL(null,
                function (src, ratio, offset, ctx) {
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
            let addPerson = $.FaceRecognizer.AddPerson;
            let that = this;
            let frames = 0;
            (function loop() {
                if (!that.paused && !that.ended) {
                    addPerson.ctx.drawImage(that, 0, 0);
                    let src = addPerson.canvas.toDataURL('image/png');
                    if (faces) {
                        $.FaceRecognizer.image.drawFaceRectangles(addPerson.ctx, faces);
                    }
                    if (frames % 3 === 0) {
                        addPerson.socket.send('find-faces;' + src);
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
                $('#add-person-btn').prop('disabled', faces.length !== 1);
            }
        );
    },
    sendForm: function () {
        let formatData = new FormData();
        formatData.append('image', this.personImage);
        let formData = this.addPersonForm.serializeArray();
        $(formData).each(function (index, obj) {
            formatData.append(obj.name, obj.value);
        });
        return $.ajax({
            type: 'POST',
            url: 'add-person',
            data: formatData,
            processData: false,
            cache: false,
            contentType: false
        });
    }
};