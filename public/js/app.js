console.log('LOADED')

/**
 * Upload the photos using ajax request.
 *
 * @param formData
 */

// TEST
function uploadFilesAzure(formData) {
    $.ajax({
        url: '/azure',
        method: 'post',
        data: formData,
        processData: false,
        contentType: false,
        xhr: function () {
            var xhr = new XMLHttpRequest();

            // Add progress event listener to the upload.
            xhr.upload.addEventListener('progress', function (event) {
                var progressBar = $('.progress-bar');

                if (event.lengthComputable) {
                    var percent = (event.loaded / event.total) * 100;
                    progressBar.width(percent + '%');
                    console.log('percent' + percent);

                    if (percent === 100) {
                        progressBar.removeClass('active');
                    }
                }
            });

            return xhr;
        },
        success: (jsonResponse) => {
            console.log('jsonResponse: ' + jsonResponse);
        }
    }).done(handleSuccess).fail(function (xhr, status) {
        console.log(status);
    });

}

// On form submit, handle the file uploads.
$('.btn.btn-default').on('click', function (event) {

    console.log(' azure upload button ');

    event.preventDefault();

    // Get the files from input, create new FormData.
    var files = $('#photos-input').get(0).files,
        formData = new FormData();

    if (files.length === 0) {
        alert('Select atleast 1 file to upload. TEST');
        return false;
    }

    if (files.length > 1) {
        alert('You can only upload up to 1  files. TEST');
        return false;
    }

    // Append the files to the formData.
    for (var i=0; i < files.length; i++) {
        var file = files[i];
        formData.append('photos[]', file, file.name);
        console.log( file );
        console.log( file.name );
    }

    // Note: We are only appending the file inputs to the FormData.
    uploadFilesAzure(formData);
});

//test

/**
 * Handle the upload response data from server and display them.
 *
 * @param data
 */
function handleSuccess(data) {

    console.log('data ' + JSON.stringify(data));
    if (data.length > 0) {
        var html = '';
        for (var i=0; i < data.length; i++) {
            var img = data[i];

            if (img.status) {
                html += '<div class="col-xs-6 col-md-4"><a href="#" class="thumbnail"><img src="' + img.publicPath + '" alt="' + img.filename  + '"></a></div>';
            } else {
                html += '<div class="col-xs-6 col-md-4"><a href="#" class="thumbnail">Invalid file type - ' + img.filename  + '</a></div>';
            }
        }
        console.log('handleSuccess ' + img.filename);

        $('#album').html(html);
    } else {
        alert('No images were uploaded.');
    }
}

// Set the progress bar to 0 when a file(s) is selected.
$('#photos-input').on('change', function () {
    $('.progress-bar').width('0%');
});
