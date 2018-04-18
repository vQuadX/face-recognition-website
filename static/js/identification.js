$.FaceRecognizer.Identification = {
    init: function () {
        this.container = $('#identification-container');
        $.FaceRecognizer.image.init(this.container);
        this.canvas = this.container.find('.face-canvas').get(0);
        this.utils = $.FaceRecognizer.utils;
        this.image = $.FaceRecognizer.image;

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
        `Зарегистрирован:<br>${info['registered']}`
    }
};

