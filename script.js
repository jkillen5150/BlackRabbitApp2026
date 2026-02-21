const form = document.getElementById('quote-form');
const submitBtn = document.getElementById('submit-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

form.addEventListener('submit', function(e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const formData = new FormData(form);
    const xhr = new XMLHttpRequest();

    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    progressText.textContent = '';
    progressContainer.style.display = (document.getElementById('photos').files.length > 0) ? 'block' : 'none';

    xhr.upload.addEventListener('progress', function(event) {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percent + '%';
            progressBar.textContent = percent + '%';
            const loaded = (event.loaded / 1048576).toFixed(1);
            const total = (event.total / 1048576).toFixed(1);
            progressText.textContent = `Uploading ${loaded} MB of ${total} MB`;
        }
    });

    xhr.addEventListener('load', function() {
        setTimeout(() => {
            window.location.href = '/thankyou.html';
        }, 1500);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Free Quote Request';
    });

    xhr.addEventListener('error', function() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Free Quote Request';
        alert('Network error – please check your connection or call (407) 951-1663 directly.');
        progressContainer.style.display = 'none';
    });

    xhr.open('POST', form.action);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(formData);
});