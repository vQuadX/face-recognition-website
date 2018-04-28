$.FaceRecognizer.Identification = {
    init: function () {
        this.container = $('#identification-container');
        $.FaceRecognizer.image.init(this.container);
        this.canvas = this.container.find('.face-canvas').get(0);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 16px Arial';
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

        this.personFaces = [];
        this.perosonsInfo = [];

        const that = this;
        $('#open-image').on('change', function (e) {
                const file = e.target.files[0];
                $.FaceRecognizer.image.openFromFile(file, null,
                    function (src, ratio, offset, ctx) {
                        that.highlightAndIdentifyFaces(that.sendImageFile(file), ratio, offset, ctx)
                    })
            }
        );
        $('#open-image-url').on('click', function () {
            return $.FaceRecognizer.image.openFromURL(null,
                function (src, ratio, offset, ctx) {
                    that.highlightAndIdentifyFaces(that.sendImageURL(src), ratio, offset, ctx)
                })
        });


        let popoverOptions = {
            trigger: 'manual',
            placement: 'left',
            html: true
        };
        let popoverIsShown = false;
        let collidesRectangle = -1;
        let canvasWrapper = $('#face-canvas-wrapper');
        canvasWrapper.on('mousemove', (e) => {
            const pos = {
                x: e.offsetX,
                y: e.offsetY
            };
            let collides = false;
            for (let i = 0; i < this.personFaces.length; i++) {
                collides = this.utils.collides(pos, this.personFaces[i]);
                if (collides) {
                    if (collidesRectangle !== i) {
                        canvasWrapper.popover('dispose');
                        popoverIsShown = false;
                    }
                    if (!popoverIsShown) {
                        popoverOptions.offset = this.getOffset(this.personFaces[i]);
                        let personInfo = this.perosonsInfo[i];
                        popoverOptions.title = personInfo ? `${personInfo['first_name']} ${personInfo['last_name']}` : 'Неизвестный';
                        popoverOptions.content = personInfo ? this.formatPersonDescription(personInfo) : '';
                        canvasWrapper.popover(popoverOptions);
                        canvasWrapper.popover('show');
                        let popoverTip = $(canvasWrapper.data('bs.popover').tip);
                        // let popoverHeight = popoverTip.height();
                        // popoverTip.find('.arrow').css({'top': `${popoverHeight / 2 - 12.5}px`});
                        //TODO
                        popoverTip.find('.arrow').css({'top': `100px`});
                        collidesRectangle = i;
                    }
                    popoverIsShown = true;
                    break;
                }
            }
            if (!collides) {
                if (popoverIsShown) {
                    canvasWrapper.popover('dispose');
                    popoverIsShown = false;
                }
                collidesRectangle = -1;
            }
        });

        let faces;
        let personsData;
        this.socket.onmessage = function (event) {
            faces = [];
            personsData = [];
            let data = JSON.parse(event.data);
            if (data.hasOwnProperty('persons')) {
                for (let i = 0; i < data.persons.length; i++) {
                    let person = data.persons[i];
                    let personId = person.id;
                    faces.push(person.area);
                    if (personId) {
                        $.ajax({
                            url: `getPersonById/${person.id}`,
                            success: function (data) {
                                personsData.push(data);
                            },
                            async: false
                        });
                    } else {
                        personsData.push(null);
                    }
                }
            } else {
                faces = null;
            }
        };


        this.video.addEventListener('play', function () {
            let identification = $.FaceRecognizer.Identification;
            identification.socket.send(JSON.stringify({'mode': 'face-recognition'}));
            let that = this;
            let frames = 0;
            (function loop() {
                if (!that.paused && !that.ended) {
                    identification.ctx.drawImage(that, 0, 0);
                    if (faces) {
                        identification.drawFaceRectanglesWithLabels(faces, personsData);
                    }
                    if (frames % 5 === 0) {
                        identification.canvas.toBlob(blob => {
                            identification.socket.send(blob);
                        }, 'image/jpeg');
                    }
                    frames++;
                    setTimeout(loop, 1000 / 25);
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
                    that.highlightAndIdentifyFaces(that.sendImageFile(blob), 1, {x: 0, y: 0}, that.ctx);
                    that.ctx.drawImage(bitmap, 0, 0);
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
            url: 'identification',
            method: 'POST',
            data: data,
            cache: false,
            contentType: false,
            processData: false
        });
    },
    sendImageURL: function (url) {
        return $.ajax({
            url: 'identification',
            method: 'GET',
            data: {'image_url': url}
        });
    },
    highlightAndIdentifyFaces: function (promise, ratio, offset, ctx) {
        promise.done(data => {
                let persons = data['persons'];
                this.perosonsInfo = persons.map(f => f['info']);
                this.personFaces = this.utils.scaleRectangles(persons.map(f => f['area']), ratio, offset);
                for (let i = 0; i < this.personFaces.length; i++) {
                    let color = this.perosonsInfo[i] ? '#4CCC2F' : '#CC2926';
                    this.image.drawFaceRectangle(ctx, this.personFaces[i], color);
                }
            }
        );
    },
    getOffset: function (rect) {
        return `${-this.canvas.height / 2 + rect.y + rect.height / 2}, -${this.canvas.width - rect.x - rect.width}`
    },
    formatPersonDescription: function (info) {
        return `Электоронная почта:<br>${info['email']}<br>` +
            `Зарегистрирован:<br>${info['registered']['formatted']}`
    },
    // TODO persons, faces
    drawFaceRectanglesWithLabels: function (faces, persons) {
        for (let i = 0; i < faces.length; i++) {
            ({x, y} = faces[i]);
            let person = persons[i];
            let strokeStyle = '#CC2926';
            if (person) {
                if (!person.hasOwnProperty('error')) {
                    strokeStyle = '#4CCC2F';
                    this.ctx.fillStyle = strokeStyle;
                    this.ctx.fillText(`${person['first_name']} ${person['last_name']}`, x, y - 10);
                }
            } else {
                this.ctx.fillStyle = strokeStyle;
                this.ctx.fillText(`Неизвестный`, x, y - 10);
            }
            this.image.drawFaceRectangle(this.ctx, faces[i], strokeStyle)
        }
    }
};
