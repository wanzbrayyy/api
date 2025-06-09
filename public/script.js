document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const apiSearchInput = document.getElementById('apiSearchInput');
    const apiModal = document.getElementById('apiModal');
    const modalBody = apiModal.querySelector('.modal-body');
    const modalCloseButton = apiModal.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalEndpointInput = document.getElementById('modalEndpoint');
    const modalParamsContainer = document.getElementById('modalParamsContainer');
    const modalSubmitButton = document.getElementById('modalSubmit');
    const modalResponseBox = document.getElementById('modalResponse');
    const copyEndpointBtn = document.getElementById('copyEndpointBtn');
    const copyResponseBtn = document.getElementById('copyResponseBtn');
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const apiListContainers = document.querySelectorAll('.api-list');

    const apis = [
        {
            id: 'create-qris',
            title: 'Create Dynamic QRIS',
            description: 'Generate a dynamic QRIS code with a specified amount.',
            method: 'POST',
            endpoint: '/api/qris/create',
            status: 'ready',
            params: [
                { name: 'amount', type: 'number', placeholder: 'e.g., 10000', required: true, label: 'Amount (IDR)' },
                { name: 'codeqr', type: 'textarea', placeholder: 'Paste your static QRIS string', required: true, label: 'Base QRIS Code' }
            ]
        },
        {
            id: 'check-qris-status',
            title: 'Check QRIS Mutation',
            description: 'Check transaction mutations for your QRIS account (OkeConnect).',
            method: 'GET',
            endpoint: '/api/qris/status',
            status: 'ready',
            params: [
                { name: 'merchantId', type: 'text', placeholder: 'Your OkeConnect Merchant ID', required: true, label: 'Merchant ID' },
                { name: 'apiKey', type: 'text', placeholder: 'Your OkeConnect API Key', required: true, label: 'API Key' }
            ]
        },
        {
            id: 'pollinations-ai',
            title: 'Pollinations AI (GPT-4.1 series)',
            description: 'Chat with GPT-4.1 models, supports image input.',
            method: 'POST',
            endpoint: '/api/ai/pollinations',
            status: 'ready',
            params: [
                { name: 'question', type: 'textarea', placeholder: 'Enter your question or prompt', required: true, label: 'Question / Prompt' },
                { name: 'systemMessage', type: 'textarea', placeholder: '(Optional) e.g., Act as a helpful assistant.', required: false, label: 'System Message' },
                {
                    name: 'model', type: 'select',
                    options: [
                        { value: 'gpt-4.1-mini', text: 'GPT-4.1 Mini (Default)' },
                        { value: 'gpt-4.1', text: 'GPT-4.1' },
                        { value: 'gpt-4.1-nano', text: 'GPT-4.1 Nano' }
                    ],
                    required: false, label: 'AI Model'
                },
                { name: 'image', type: 'file', accept: 'image/*', required: false, label: 'Image (Optional)' }
            ]
        }
    ];

    function applyTheme(theme) {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        themeToggleBtn.innerHTML = theme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', theme);
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toastNotification');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = toast.querySelector('.toast-icon');

        toastMessage.textContent = message;
        toast.className = 'toast show';
        toastIcon.className = `fas toast-icon ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}`;
        toast.classList.add(type);

        setTimeout(() => {
            toast.className = toast.className.replace("show", "");
            toast.classList.remove(type);
        }, 3000);
    }

    function typeWriter(element, text, speed = 10, callback) {
        let i = 0;
        element.innerHTML = '';
        const originalSpeed = speed;

        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                let currentSpeed = originalSpeed;
                if (text.charAt(i - 1) === '\n' || text.charAt(i - 1) === '{' || text.charAt(i - 1) === '}') {
                    currentSpeed = originalSpeed * 2;
                }
                setTimeout(type, currentSpeed);
            } else if (callback) {
                callback();
            }
        }
        type();
    }

    function renderAPIs(searchTerm = '') {
        apiListContainers.forEach(container => container.innerHTML = '');
        const filteredApis = apis.filter(api =>
            api.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            api.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filteredApis.forEach(api => {
            const card = `
                <div class="api-card" data-api-id="${api.id}">
                    <div class="api-card-header">
                        <h3><i class="fas ${api.id === 'pollinations-ai' ? 'fa-robot' : 'fa-cogs'}"></i> ${api.title}</h3>
                        <span class="api-status-badge ${api.status}">${api.status}</span>
                    </div>
                    <p>${api.description}</p>
                    <button class="api-action-button" data-method="${api.method}">
                        <i class="fas ${api.method === 'POST' ? 'fa-code-branch' : 'fa-play-circle'}"></i>
                        ${api.method === 'POST' ? 'TRY POST' : 'TRY GET'}
                    </button>
                </div>
            `;
            apiListContainers.forEach(container => container.insertAdjacentHTML('beforeend', card));
        });

        document.querySelectorAll('.api-action-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.api-card');
                const apiId = card.dataset.apiId;
                const selectedApi = apis.find(a => a.id === apiId);
                openModal(selectedApi);
            });
        });
    }

    function openModal(api) {
        modalTitle.textContent = api.title;
        modalDescription.textContent = api.description;
        modalEndpointInput.value = api.endpoint;
        modalParamsContainer.innerHTML = '';
        copyResponseBtn.style.display = 'none';

        api.params.forEach(param => {
            const paramId = `param-${param.name}`;
            let inputHtml;
            if (param.type === 'textarea') {
                inputHtml = `<textarea id="${paramId}" name="${param.name}" placeholder="${param.placeholder || ''}" ${param.required ? 'required' : ''}></textarea>`;
            } else if (param.type === 'select') {
                const optionsHtml = param.options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
                inputHtml = `<select id="${paramId}" name="${param.name}">${optionsHtml}</select>`;
            } else if (param.type === 'file') {
                inputHtml = `<input type="file" id="${paramId}" name="${param.name}" accept="${param.accept || '*'}">`;
            }
            else {
                inputHtml = `<input type="${param.type}" id="${paramId}" name="${param.name}" placeholder="${param.placeholder || ''}" ${param.required ? 'required' : ''}>`;
            }
            const paramElement = `
                <div class="form-group">
                    <label for="${paramId}">${param.label}${param.required ? '<span style="color:red">*</span>' : ''}</label>
                    ${inputHtml}
                </div>
            `;
            modalParamsContainer.insertAdjacentHTML('beforeend', paramElement);
        });

        modalSubmitButton.dataset.apiId = api.id;
        modalResponseBox.innerHTML = 'Click "Submit" to see the response.';
        modalResponseBox.className = 'response-box';
        
        apiModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        if(modalBody) modalBody.scrollTop = 0;
    }

    function closeModal() {
        apiModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    modalCloseButton.onclick = closeModal;

    window.onclick = (event) => {
        if (event.target == apiModal) {
            closeModal();
        }
    }

    modalSubmitButton.addEventListener('click', async () => {
        const apiId = modalSubmitButton.dataset.apiId;
        const api = apis.find(a => a.id === apiId);
        if (!api) return;

        modalSubmitButton.disabled = true;
        modalSubmitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        modalResponseBox.innerHTML = '<div class="loader-small"></div> Processing request...';
        modalResponseBox.classList.add('processing');
        copyResponseBtn.style.display = 'none';
        if(modalBody) modalBody.scrollTop = modalBody.scrollHeight;

        let payload = {};
        let queryParams = '';
        let formIsValid = true;
        let imageBase64 = null;

        const paramPromises = api.params.map(async param => {
            const inputElement = document.getElementById(`param-${param.name}`);
            if (inputElement) {
                if (param.type === 'file') {
                    if (inputElement.files && inputElement.files[0]) {
                        const file = inputElement.files[0];
                        try {
                            const base64String = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result.split(',')[1]);
                                reader.onerror = error => reject(error);
                                reader.readAsDataURL(file);
                            });
                            imageBase64 = base64String;
                        } catch (error) {
                            formIsValid = false;
                        }
                    }
                } else {
                    if (param.required && !inputElement.value.trim() && inputElement.value !== undefined) {
                        formIsValid = false;
                        inputElement.style.borderColor = 'red';
                    } else {
                        inputElement.style.borderColor = '';
                    }
                    if (inputElement.value || (param.type === 'select' && inputElement.value)) { 
                         if (api.method === 'POST') {
                            payload[param.name] = inputElement.value;
                        } else if (api.method === 'GET') {
                            queryParams += `${queryParams ? '&' : '?'}${param.name}=${encodeURIComponent(inputElement.value)}`;
                        }
                    }
                }
            }
        });

        await Promise.all(paramPromises);
        
        if (api.method === 'POST' && imageBase64) {
            payload.imageBase64 = imageBase64;
        }
         if (api.method === 'POST' && payload.image !== undefined) {
            delete payload.image;
        }


        if (!formIsValid) {
            showToast('Please fill all required fields or check file input.', 'error');
            modalSubmitButton.disabled = false;
            modalSubmitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
            modalResponseBox.innerHTML = 'Error: Missing required fields or file error.';
            modalResponseBox.classList.remove('processing');
            return;
        }
        
        const url = api.endpoint + (api.method === 'GET' ? queryParams : '');
        const options = { method: api.method };
        if (api.method === 'POST') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(payload);
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            modalResponseBox.classList.remove('processing');

            const responseText = JSON.stringify(data, null, 2);
            typeWriter(modalResponseBox, responseText, 5, () => {
                 copyResponseBtn.style.display = 'inline-block';
                 if(modalBody) modalBody.scrollTop = modalBody.scrollHeight;
            });

            if (data.status === true || (response.ok && data.status !== false)) {
                showToast(data.message || `${api.title} request successful!`, 'success');
            } else {
                showToast(data.message || `${api.title} request failed.`, 'error');
            }
        } catch (error) {
            modalResponseBox.classList.remove('processing');
            typeWriter(modalResponseBox, JSON.stringify({ status: false, message: error.message, creator: "WANZOFC TECT" }, null, 2), 5, () => {
                if(modalBody) modalBody.scrollTop = modalBody.scrollHeight;
            });
            showToast('An error occurred: ' + error.message, 'error');
        } finally {
            modalSubmitButton.disabled = false;
            modalSubmitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
        }
    });

    copyEndpointBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(modalEndpointInput.value)
            .then(() => showToast('Endpoint copied!'))
            .catch(() => showToast('Failed to copy endpoint.', 'error'));
    });

    copyResponseBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(modalResponseBox.textContent)
            .then(() => showToast('Response copied!'))
            .catch(() => showToast('Failed to copy response.', 'error'));
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
    
    const preferredTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferredTheme);


    apiSearchInput.addEventListener('input', (e) => renderAPIs(e.target.value));

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.hasAttribute('target') && item.getAttribute('target') === '_blank') {
                window.open(item.href, '_blank');
                return;
            }

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.dataset.target;
            contentSections.forEach(section => {
                section.classList.remove('active-content');
                if (section.id === targetId) {
                    section.classList.add('active-content');
                }
            });
            sidebar.classList.remove('open');
        });
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);

            Swal.fire({
                title: '🚀 Welcome to WANZOFC TECT API!',
                html: `
                    <p>Explore powerful APIs or <a href="#docs-content" style="color:var(--primary-color); text-decoration:underline;" onclick="Swal.close(); document.querySelector('.nav-item[data-target=docs-content]').click();">read the docs</a>.</p>
                `,
                icon: 'info',
                confirmButtonText: '<i class="fas fa-thumbs-up"></i> Got it!',
                customClass: {
                    popup: 'swal-custom-popup',
                    confirmButton: 'swal-custom-confirm'
                }
            });
            renderAPIs();
            document.getElementById('home-content').classList.add('active-content');
        }, 500);
    });
});