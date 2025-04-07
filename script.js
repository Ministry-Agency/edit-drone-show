document.addEventListener("DOMContentLoaded", async function () {
    if (typeof supabase === "undefined") return;

    const SUPABASE_URL = 'https://jymaupdlljtwjxiiistn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bWF1cGRsbGp0d2p4aWlpc3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MTcxMTgsImV4cCI6MjA1NDQ5MzExOH0.3K22PNYIHh8NCreiG0NBtn6ITFrL3cVmSS5KCG--niY';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    window.uploadedFiles = [];
    const editId = localStorage.getItem('edit_id');
    let isEditMode = !!editId;

    // Конфигурация для селекторов
    const selectorsConfig = {
        included: {
            table: 'main_categories_includes',
            valueField: 'includes_name',
            idField: 'included_id',
            filterField: 'main_category_name'
        },
        drones: {
            table: 'drone_main_category',
            valueField: 'drone_name',
            idField: 'drone_id',
            filterField: 'category_name'
        },
        software: {
            table: 'software_main_category',
            valueField: 'software_name',
            idField: 'software_id',
            filterField: 'main_category_name'
        }
    };

    async function loadTypeOptions() {
        try {
            const typeSelect = document.getElementById('type-2');
            if (!typeSelect) return;
            
            // Загрузка категорий для нового типа услуги
            // Измените main_category_id на нужный ID вашего нового типа услуг
            const { data, error } = await supabaseClient
                .from('category_main_category')
                .select('category_name, category_id, id')
                .eq('main_category_id', 2); // Изменено на 2 для нового типа услуги

            if (error || !data || data.length === 0) return;
            
            typeSelect.innerHTML = '';
            data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_name;
                option.textContent = category.category_name;
                option.setAttribute('data-id', category.category_id);
                typeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Ошибка загрузки типов услуг:', error);
        }
    }
    
    // Загрузка диапазонов и шагов для дронов
    async function loadDroneRanges() {
        const minInput = document.querySelector('input[data-name="drone_show_min_num"]');
        const maxInput = document.querySelector('input[data-name="drone_show_max_num"]');
        const stepInput = document.querySelector('input[data-name="drone_show_step"]');
        
        if (!minInput || !maxInput || !stepInput) return;
        
        try {
            const { data, error } = await supabaseClient
                .from('show_steps')
                .select('step')
                .order('step', { ascending: true });
            
            if (error || !data || data.length === 0) return;
            
            // Установка минимального, максимального значений и шага
            const steps = data.map(item => parseInt(item.step));
            const min = Math.min(...steps);
            const max = Math.max(...steps);
            const step = steps.length > 1 ? steps[1] - steps[0] : 100;
            
            minInput.value = min;
            maxInput.value = max;
            stepInput.value = step;
            
        } catch (error) {
            console.error('Ошибка загрузки диапазонов дронов:', error);
        }
    }
    
    // Загрузка данных услуги в режиме редактирования
    async function loadServiceData(serviceId) {
        try {
            const { data: serviceData, error: serviceError } = await supabaseClient
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .single();

            if (serviceError || !serviceData) {
                console.error('Ошибка загрузки данных услуги:', serviceError);
                return;
            }

            const { data: categoryData } = await supabaseClient
                .from('service_categories')
                .select('category_id, category_name')
                .eq('service_id', serviceId)
                .single();

            const { data: dronesData } = await supabaseClient
                .from('service_drones')
                .select('drone_id, drone_name')
                .eq('service_id', serviceId);
                
            const { data: softwareData } = await supabaseClient
                .from('service_softwares')
                .select('software_id, software_name')
                .eq('service_id', serviceId);
                
            const { data: includedData } = await supabaseClient
                .from('service_includes')
                .select('included_id, included_name')
                .eq('service_id', serviceId);
                
            const { data: countryData } = await supabaseClient
                .from('service_country')
                .select('country_id, country_name')
                .eq('service_id', serviceId);
                
            const { data: cityData } = await supabaseClient
                .from('service_city')
                .select('city_id, city_name')
                .eq('service_id', serviceId);

            fillFormWithData(
                serviceData, 
                categoryData, 
                countryData || [], 
                cityData || [], 
                dronesData || [], 
                softwareData || [], 
                includedData || []
            );

        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
        }
    }
    
    // Настройка отправки формы
    function setupFormSubmission() {
        const form = document.getElementById("wf-form-create-service");
        if (!form) return;
        
        // Создаем скрытое поле для хранения URL удаленных изображений
        let deletedImagesInput = document.getElementById('deleted-images-input');
        if (!deletedImagesInput) {
            deletedImagesInput = document.createElement('input');
            deletedImagesInput.type = 'hidden';
            deletedImagesInput.id = 'deleted-images-input';
            deletedImagesInput.name = 'deleted_images';
            form.appendChild(deletedImagesInput);
        }
        
        const submitButton = form.querySelector('input[type="submit"], .form-button.is--primal');
        
        if (submitButton) {
            submitButton.addEventListener('click', function(event) {
                if (submitButton.disabled) return;
                
                event.preventDefault();
                
                const formData = new FormData();
                const processedFields = new Set();
                
                // Добавляем все поля формы
                form.querySelectorAll('input:not([type="file"]):not([no-for-sending=""]), select, textarea').forEach(input => {
                    if (input.name && !input.name.includes('[]') && !processedFields.has(input.name)) {
                        formData.append(input.name, input.value);
                        processedFields.add(input.name);
                    }
                });
                
                // Добавляем скрытые поля
                form.querySelectorAll('input[type="hidden"][id]').forEach(input => {
                    if (input.name && input.value && !processedFields.has(input.name)) {
                        formData.append(input.name, input.value);
                        processedFields.add(input.name);
                    }
                });
                
                formData.append('form_name', form.getAttribute('name') || 'wf-form-create-service');
                
                // Разделяем существующие изображения и новые файлы
                const existingImages = [];
                const newFiles = [];
                
                window.uploadedFiles.forEach(file => {
                    if (typeof file === 'string') {
                        existingImages.push(file);
                    } else {
                        newFiles.push(file);
                    }
                });
                
                // Добавляем существующие изображения в JSON формате
                if (existingImages.length > 0) {
                    formData.append('existing_images', JSON.stringify(existingImages));
                }
                
                // Добавляем удаленные изображения в JSON формате
                if (window.deletedImages && window.deletedImages.length > 0) {
                    deletedImagesInput.value = JSON.stringify(window.deletedImages);
                    formData.append('deleted_images', JSON.stringify(window.deletedImages));
                }
                
                // Добавляем новые файлы
                for (let i = 0; i < newFiles.length; i++) {
                    const file = newFiles[i];
                    formData.append(`files`, file);
                    formData.append(`fileType`, 'service-images');
                    formData.append(`fileName`, `service-${file.name}`);
                }
                
                // Отправляем общее количество изображений
                formData.append('service_images_count', window.uploadedFiles.length);
                formData.append('new_files_count', newFiles.length);
                formData.append('existing_files_count', existingImages.length);
                
                const webhookUrl = form.action;
                const redirectUrl = "https://www.thewowdrone.com/personal-account/seller";
                
                const xhr = new XMLHttpRequest();
                
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        if (isEditMode) {
                            localStorage.removeItem('edit_id');
                        }
                        
                        setTimeout(() => {
                            window.location.href = redirectUrl;
                        }, 2000);
                    }
                };
                
                xhr.onerror = function() {
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                    }, 2000);
                };
                
                xhr.open('POST', webhookUrl, true);
                xhr.send(formData);
            });
        }
    }

    // Инициализация галереи
    function setupGallery() {
        document.querySelectorAll('.service-gallery-img-delete').forEach(deleteBtn => {
            deleteBtn.onclick = function(event) {
                handleDeleteImage(event);
            };
        });

        const originalFileInput = document.querySelector('.creating-content-form-field-cover_image input[type="file"]');
        const addMoreButton = document.querySelector('[service-gallery-add]');
        
        if (originalFileInput && addMoreButton) {
            originalFileInput.setAttribute('accept', 'image/*,video/*');
            if (!originalFileInput.hasAttribute('name')) {
                originalFileInput.setAttribute('name', 'files[]');
            }
            
            originalFileInput.style.position = 'absolute';
            originalFileInput.style.top = '0';
            originalFileInput.style.left = '0';
            originalFileInput.style.width = '100%';
            originalFileInput.style.height = '100%';
            originalFileInput.style.opacity = '0';
            originalFileInput.style.cursor = 'pointer';
            originalFileInput.style.zIndex = '1000';
            
            addMoreButton.style.position = 'relative';
            addMoreButton.appendChild(originalFileInput);
            
            originalFileInput.onchange = function(event) {
                const files = Array.from(event.target.files || []);
                if (files.length > 0) {
                    window.uploadedFiles = window.uploadedFiles.concat(files);
                    updateGallery();
                }
            };
        }
        
        updateAddMoreButtonSize();
    }

    // Обработка удаления изображения
    function handleDeleteImage(event) {
        const deleteBtn = event.target;
        const parentItem = deleteBtn.closest('.service-gallery-img-item, .service-gallery-img-big-wrapper');
        
        if (!parentItem) return;
        
        const isBigImage = parentItem.classList.contains('service-gallery-img-big-wrapper');
        
        if (isBigImage) {
            // Если удаляется главное изображение, удаляем первый элемент из массива
            const deletedImage = window.uploadedFiles[0];
            window.uploadedFiles.splice(0, 1);
            
            // Запоминаем удаленное изображение
            if (typeof deletedImage === 'string' && !window.deletedImages) {
                window.deletedImages = [deletedImage];
            } else if (typeof deletedImage === 'string') {
                window.deletedImages.push(deletedImage);
            }
        } else {
            // Если удаляется миниатюра, находим ее индекс
            const smallImageItems = Array.from(document.querySelectorAll('.service-gallery-img-item'));
            const index = smallImageItems.indexOf(parentItem);
            
            if (index !== -1) {
                // Индекс в массиве uploadedFiles смещен на 1 из-за главного изображения
                const realIndex = index + 1;
                const deletedImage = window.uploadedFiles[realIndex];
                window.uploadedFiles.splice(realIndex, 1);
                
                // Запоминаем удаленное изображение
                if (typeof deletedImage === 'string' && !window.deletedImages) {
                    window.deletedImages = [deletedImage];
                } else if (typeof deletedImage === 'string') {
                    window.deletedImages.push(deletedImage);
                }
            }
        }
        
        updateGallery();
    }

    // Обновление размера кнопки добавления
    function updateAddMoreButtonSize() {
        const addMoreButton = document.querySelector('[service-gallery-add]');
        if (!addMoreButton) return;
        
        if (window.uploadedFiles.length === 0) {
            addMoreButton.style.width = '100%';
            addMoreButton.style.height = '21.719vw';
        } else {
            addMoreButton.style.width = '11.406vw';
            addMoreButton.style.height = '8.594vw';
        }
        
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            if (window.uploadedFiles.length === 0) {
                addMoreButton.style.width = '100%';
                addMoreButton.style.height = '50vw';
            } else {
                addMoreButton.style.width = '23vw';
                addMoreButton.style.height = '17vw';
            }
        }
    }

    // Обновление галереи
    function updateGallery() {
        if (window.uploadedFiles.length === 0) {
            const bigWrapper = document.querySelector('.service-gallery-img-big-wrapper');
            if (bigWrapper) bigWrapper.style.display = 'none';
            
            document.querySelectorAll('.service-gallery-img-item').forEach(item => {
                item.style.display = 'none';
            });
            
            updateAddMoreButtonSize();
            return;
        }
        
        const bigImageWrapper = document.querySelector('.service-gallery-img-big-wrapper');
        const bigImage = document.querySelector('.service-gallery-img-big');
        
        if (bigImageWrapper && bigImage && window.uploadedFiles[0]) {
            bigImageWrapper.style.display = 'block';
            
            if (typeof window.uploadedFiles[0] === 'string') {
                bigImage.src = window.uploadedFiles[0];
            } else if (window.uploadedFiles[0].type && window.uploadedFiles[0].type.startsWith('video/')) {
                displayVideoInElement(window.uploadedFiles[0], bigImage);
            } else {
                displayImageInElement(window.uploadedFiles[0], bigImage);
            }
        }
        
        const smallImageItems = document.querySelectorAll('.service-gallery-img-item');
        smallImageItems.forEach(item => {
            item.style.display = 'none';
        });
        
        for (let i = 1; i < window.uploadedFiles.length && i < smallImageItems.length + 1; i++) {
            const smallImageItem = smallImageItems[i - 1];
            const smallImage = smallImageItem.querySelector('.service-gallery-img');
            
            if (smallImageItem && smallImage) {
                smallImageItem.style.display = 'block';
                
                if (typeof window.uploadedFiles[i] === 'string') {
                    smallImage.src = window.uploadedFiles[i];
                } else if (window.uploadedFiles[i].type && window.uploadedFiles[i].type.startsWith('video/')) {
                    displayVideoInElement(window.uploadedFiles[i], smallImage);
                } else {
                    displayImageInElement(window.uploadedFiles[i], smallImage);
                }
            }
        }
        
        updateAddMoreButtonSize();
    }

    // Отображение изображения в элементе
    function displayImageInElement(file, imgElement) {
        if (!file || !imgElement) return;
        
        if (typeof file === 'string') {
            imgElement.src = file;
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imgElement.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Отображение видео в элементе
    function displayVideoInElement(file, imgElement) {
        if (!file || !imgElement) return;
        
        imgElement.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23cccccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2214px%22%20fill%3D%22%23333333%22%3ELoading...%3C%2Ftext%3E%3C%2Fsvg%3E';
        
        if (typeof file === 'string') {
            imgElement.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23333333%22%2F%3E%3Cpath%20d%3D%22M20%2C10%20L50%2C30%20L20%2C50%20Z%22%20fill%3D%22white%22%2F%3E%3C%2Fsvg%3E';
            return;
        }
        
        generateVideoThumbnail(file, imgElement);
    }

    // Генерация миниатюры видео
    function generateVideoThumbnail(videoFile, imgElement) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        const videoURL = URL.createObjectURL(videoFile);
        video.src = videoURL;
        
        video.onloadedmetadata = function() {
            video.currentTime = 0.1;
        };
        
        video.onseeked = function() {
            const canvas = document.createElement('canvas');
            
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                canvas.width = 320;
                canvas.height = 240;
            } else {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
            
            const ctx = canvas.getContext('2d');
            try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                if (imgElement) imgElement.src = dataUrl;
            } catch (e) {
                console.error('Ошибка при создании миниатюры видео:', e);
            }
            
            URL.revokeObjectURL(videoURL);
        };
        
        video.onerror = function(e) {
            if (imgElement) {
                imgElement.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23cccccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2214px%22%20fill%3D%22%23333333%22%3EОшибка%3C%2Ftext%3E%3C%2Fsvg%3E';
            }
            URL.revokeObjectURL(videoURL);
        };
        
        try {
            video.load();
        } catch (e) {
            console.error('Ошибка при загрузке видео:', e);
        }
    }

    // Заполнение формы данными
    function fillFormWithData(service, category, countries, cities, drones, software, included) {
        // Заполнение основных полей
        const serviceNameInput = document.getElementById('service-name-3');
        if (serviceNameInput && service.name) {
            serviceNameInput.value = service.name;
        }

        const descriptionInput = document.getElementById('description-3');
        if (descriptionInput && service.service_description) {
            descriptionInput.value = service.service_description;
        }

        // Выбор категории
        if (category) {
            const typeSelect = document.getElementById('type-2');
            if (typeSelect) {
                for (let i = 0; i < typeSelect.options.length; i++) {
                    if (typeSelect.options[i].getAttribute('data-id') == category.category_id) {
                        typeSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        // Заполнение изображений
        if (service.image_urls) {
            try {
                let imageUrls;
                if (typeof service.image_urls === 'string') {
                    if (service.image_urls.startsWith('http')) {
                        imageUrls = [service.image_urls];
                    } else {
                        try {
                            imageUrls = JSON.parse(service.image_urls);
                            if (!Array.isArray(imageUrls)) {
                                imageUrls = [service.image_urls];
                            }
                        } catch (jsonError) {
                            imageUrls = [service.image_urls];
                        }
                    }
                } else if (Array.isArray(service.image_urls)) {
                    imageUrls = service.image_urls;
                } else {
                    imageUrls = [];
                }
                
                if (imageUrls.length > 0) {
                    window.uploadedFiles = imageUrls;
                    
                    const galleryItems = document.querySelectorAll('.service-gallery-img-item');
                    const bigImage = document.querySelector('.service-gallery-img-big');
                    const bigImageWrapper = document.querySelector('.service-gallery-img-big-wrapper');
                    
                    if (bigImage && bigImageWrapper && imageUrls.length > 0) {
                        bigImageWrapper.style.display = 'block';
                        bigImage.src = imageUrls[0];
                    }
                    
                    galleryItems.forEach(item => {
                        item.style.display = 'none';
                    });
                    
                    imageUrls.slice(1).forEach((url, index) => {
                        if (index < galleryItems.length) {
                            const item = galleryItems[index];
                            const img = item.querySelector('.service-gallery-img');
                            if (img) {
                                item.style.display = 'block';
                                img.src = url;
                            }
                        }
                    });
                    
                    updateAddMoreButtonSize();
                }
            } catch (error) {
                console.error('Ошибка при загрузке изображений:', error);
            }
        }

        // Другие поля для нового типа услуги
        if (service.approval_time_required) {
            const approvalTimeInput = document.querySelector('input[data-name="approval_time"]');
            if (approvalTimeInput) {
                approvalTimeInput.value = service.approval_time_required;
            }
        }

        if (service.cost_per_drone_show) {
            const costPerShowInput = document.querySelector('input[data-name="cost_per_show"]');
            if (costPerShowInput) {
                costPerShowInput.value = service.cost_per_drone_show;
            }
        }

        if (service.cost_per_drone_shownoanim) {
            const costPerShowNoAnimInput = document.querySelector('input[data-name="cost_per_showwithoutanim"]');
            if (costPerShowNoAnimInput) {
                costPerShowNoAnimInput.value = service.cost_per_drone_shownoanim;
            }
        }

        if (service.cost_per_crew) {
            const costPerCrewInput = document.querySelector('input[data-name="cost_per_crew"]');
            if (costPerCrewInput) {
                costPerCrewInput.value = service.cost_per_crew;
            }
        }

        if (service.operators_number) {
            const operatorsNumberInput = document.querySelector('input[data-name="number_of_operators"]');
            if (operatorsNumberInput) {
                operatorsNumberInput.value = service.operators_number;
            }
        }

        // Установка ID в форму для режима редактирования
        const form = document.getElementById('wf-form-create-service');
        if (form) {
            const serviceIdInput = document.createElement('input');
            serviceIdInput.type = 'hidden';
            serviceIdInput.name = 'service_id';
            serviceIdInput.value = service.id;
            form.appendChild(serviceIdInput);
            
            form.action = 'https://n8n.thewowdrone.com/webhook/edit-a-service-show';
            
            const submitButton = form.querySelector('input[type="submit"]');
            if (submitButton) {
                submitButton.value = 'UPDATE';
            }
        }
        
        const nextButton = document.querySelector('.button_embed .form-button');
        if (nextButton) {
            nextButton.textContent = 'NEXT 1/2';
        }
    }

    // Инициализация мульти-селекторов
    async function initializeSelect(dataName) {
        const config = selectorsConfig[dataName];
        if (!config) return;

        async function updateSelectOptions() {
            try {
                const categoryInput = document.querySelector('input[name="main_category"]');
                if (!categoryInput) return;

                const categoryValue = categoryInput.value;

                const { data, error } = await supabaseClient
                    .from(config.table)
                    .select(`${config.valueField}, ${config.idField}`)
                    .eq(config.filterField, categoryValue);

                if (error || !data || data.length === 0) return;

                const wrapper = document.querySelector(`input[data-name="${dataName}"]`).closest('[ms-code-select-wrapper="multi"]');
                if (!wrapper) return;

                wrapper.innerHTML = `
                    <input 
                        class="creating-form_field w-input" 
                        ms-code-select-options="${data.map(item => item[config.valueField]).join(', ')}" 
                        autocomplete="off" 
                        maxlength="256" 
                        type="text"
                        data-name="${dataName}_display" 
                        placeholder="Select ${dataName}" 
                        ms-code-select="input"
                        style="cursor: pointer; background-color: #fff;">
                    <input 
                        type="hidden" 
                        name="${dataName}" 
                        id="${dataName}" 
                        data-ms-member="${dataName}">
                    <div 
                        data-lenis-prevent="" 
                        ms-code-select="list" 
                        class="form_tag-list" 
                        style="display: none;">
                        <div 
                            ms-code-select="selected-wrapper" 
                            class="form_selected-wrapper">
                        </div>
                        <div 
                            ms-code-select="empty-state" 
                            class="form_empty-state" 
                            style="display: none;">
                            Uh oh, no results found!
                        </div>
                        ${data.map(item => `
                            <div 
                                ms-code-select="tag-name-new" 
                                class="form_option"
                                data-id="${item[config.idField]}"
                                data-value="${item[config.valueField]}">${item[config.valueField]}
                            </div>
                        `).join('')}
                    </div>`;

                const displayInput = wrapper.querySelector('[ms-code-select="input"]');
                displayInput.addEventListener('keydown', (e) => e.preventDefault());
                
                const hiddenInput = wrapper.querySelector(`input[name="${dataName}"]`);
                const list = wrapper.querySelector('[ms-code-select="list"]');
                const selectedWrapper = list.querySelector('[ms-code-select="selected-wrapper"]');

                function updateInputValues() {
                    const selectedTags = selectedWrapper.querySelectorAll('[ms-code-select="tag"]');
                    displayInput.value = Array.from(selectedTags)
                        .map(tag => tag.dataset.value)
                        .join(', ');
                    hiddenInput.value = Array.from(selectedTags)
                        .map(tag => tag.dataset.id)
                        .join(',');
                }

                list.querySelectorAll('[ms-code-select="tag-name-new"]').forEach(option => {
                    option.addEventListener('click', function() {
                        const value = this.dataset.value;
                        const id = this.dataset.id;
                        
                        const tag = document.createElement('div');
                        tag.setAttribute('ms-code-select', 'tag');
                        tag.setAttribute('data-id', id);
                        tag.setAttribute('data-value', value);
                        tag.className = 'form_tag';
                        tag.innerHTML = `
                            <div ms-code-select="tag-name-selected" class="text-styles_text">${value}</div>
                            <div ms-code-select="tag-close" class="form_tag-close">✕</div>
                        `;

                        selectedWrapper.appendChild(tag);
                        this.style.display = 'none';
                        
                        updateInputValues();

                        tag.querySelector('[ms-code-select="tag-close"]').addEventListener('click', function(e) {
                            e.stopPropagation();
                            Array.from(list.querySelectorAll('[ms-code-select="tag-name-new"]'))
                                .find(opt => opt.dataset.value === value)
                                .style.display = 'block';
                            tag.remove();
                            updateInputValues();
                        });
                    });
                });

                displayInput.addEventListener('focus', () => list.style.display = 'block');
                document.addEventListener('click', (e) => {
                    if (!wrapper.contains(e.target)) {
                        list.style.display = 'none';
                    }
                });

                // Загрузка выбранных значений в режиме редактирования
                if (isEditMode) {
                    setTimeout(async () => {
                        let table, idField, nameField;
                        
                        if (dataName === 'included') {
                            table = 'service_includes';
                            idField = 'included_id';
                            nameField = 'included_name';
                        } else if (dataName === 'drones') {
                            table = 'service_drones';
                            idField = 'drone_id';
                            nameField = 'drone_name';
                        } else if (dataName === 'software') {
                            table = 'service_softwares';
                            idField = 'software_id';
                            nameField = 'software_name';
                        }

                        const { data: selected, error: selectedError } = await supabaseClient
                            .from(table)
                            .select(`${idField}, ${nameField}`)
                            .eq('service_id', editId);

                        if (!selectedError && selected && selected.length > 0) {
                            selected.forEach(item => {
                                const id = item[idField];
                                const value = item[nameField];
                                
                                if (!id || !value) return;
                                
                                const options = list.querySelectorAll('[ms-code-select="tag-name-new"]');
                                let found = false;
                                
                                for (let i = 0; i < options.length; i++) {
                                    const option = options[i];
                                    
                                    if (option.dataset.id == id || option.dataset.value === value) {
                                        option.style.display = 'none';
                                        found = true;
                                        
                                        const tag = document.createElement('div');
                                        tag.setAttribute('ms-code-select', 'tag');
                                        tag.setAttribute('data-id', id);
                                        tag.setAttribute('data-value', value);
                                        tag.className = 'form_tag';
                                        tag.innerHTML = `
                                            <div ms-code-select="tag-name-selected" class="text-styles_text">${value}</div>
                                            <div ms-code-select="tag-close" class="form_tag-close">✕</div>
                                        `;
                                        
                                        selectedWrapper.appendChild(tag);
                                        
                                        tag.querySelector('[ms-code-select="tag-close"]').addEventListener('click', function(e) {
                                            e.stopPropagation();
                                            option.style.display = 'block';
                                            tag.remove();
                                            updateInputValues();
                                        });
                                        
                                        break;
                                    }
                                }
                                
                                if (!found) {
                                    // Добавляем тег даже если не нашли соответствующую опцию
                                    const tag = document.createElement('div');
                                    tag.setAttribute('ms-code-select', 'tag');
                                    tag.setAttribute('data-id', id);
                                    tag.setAttribute('data-value', value);
                                    tag.className = 'form_tag';
                                    tag.innerHTML = `
                                        <div ms-code-select="tag-name-selected" class="text-styles_text">${value}</div>
                                        <div ms-code-select="tag-close" class="form_tag-close">✕</div>
                                    `;
                                    
                                    selectedWrapper.appendChild(tag);
                                    
                                    tag.querySelector('[ms-code-select="tag-close"]').addEventListener('click', function(e) {
                                        e.stopPropagation();
                                        tag.remove();
                                        updateInputValues();
                                    });
                                }
                            });
                            
                            updateInputValues();
                        }
                    }, 500);
                }

            } catch (error) {
                console.error(`Ошибка обновления селектора ${dataName}:`, error);
            }
        }

        const categoryInput = document.querySelector('input[name="main_category"]');
        if (categoryInput) {
            categoryInput.addEventListener('change', updateSelectOptions);
        }

        await updateSelectOptions();
    }

    // Инициализация мульти-селекторов для стран и городов
    function setupCountriesAndCities() {
        const countrysContainer = document.getElementById('countrys-container');
        const citysContainer = document.getElementById('citys-container');
        
        if (!countrysContainer || !citysContainer) return;
        
        // Настройка мульти-селектора стран
        setupMultiSelect(
            countrysContainer, 
            'country-input', 
            'countrys-list', 
            'selected_countrys', 
            async function(query) {
                const { data, error } = await supabaseClient
                    .from('countries')
                    .select('id, name')
                    .ilike('name', `%${query}%`)
                    .limit(10);
                
                return error ? [] : data.map(item => ({ id: item.id, value: item.name }));
            },
            isEditMode ? loadSelectedCountries : null
        );
        
        // Настройка мульти-селектора городов
        setupMultiSelect(
            citysContainer, 
            'city-input', 
            'citys-list', 
            'selected_citys', 
            async function(query) {
                const selectedCountrys = document.getElementById('selected_countrys');
                if (!selectedCountrys || !selectedCountrys.value) return [];
                
                const countryIds = selectedCountrys.value.split(',');
                
                const { data, error } = await supabaseClient
                    .from('cities')
                    .select('id, name, country_id')
                    .ilike('name', `%${query}%`)
                    .in('country_id', countryIds)
                    .limit(10);
                
                return error ? [] : data.map(item => ({ id: item.id, value: item.name }));
            },
            isEditMode ? loadSelectedCities : null
        );
        
        // Обновление списка городов при изменении выбранных стран
        document.getElementById('selected_countrys').addEventListener('change', function() {
            // Очищаем список выбранных городов при изменении стран
            const citysList = document.getElementById('citys-list');
            const selectedCitys = document.getElementById('selected_citys');
            
            if (citysList && selectedCitys) {
                citysList.innerHTML = '';
                selectedCitys.value = '';
                document.getElementById('city-input').value = '';
            }
        });
    }
    
    // Функция для настройки мульти-селектора
    function setupMultiSelect(container, inputId, listId, hiddenInputId, fetchDataFunc, onInitCallback) {
        if (!container) return;
        
        const inputField = document.getElementById(inputId);
        const itemsList = document.getElementById(listId);
        const hiddenInput = document.getElementById(hiddenInputId);
        
        if (!inputField || !itemsList || !hiddenInput) return;
        
        // Обработка ввода в поле поиска
        inputField.addEventListener('input', async function() {
            const query = this.value.trim();
            if (query.length < 2) return;
            
            const items = await fetchDataFunc(query);
            
            // Создаем выпадающий список с результатами
            const dropdown = document.createElement('div');
            dropdown.className = 'multi-select-dropdown';
            dropdown.style.position = 'absolute';
            dropdown.style.top = (inputField.offsetTop + inputField.offsetHeight) + 'px';
            dropdown.style.left = inputField.offsetLeft + 'px';
            dropdown.style.width = inputField.offsetWidth + 'px';
            dropdown.style.maxHeight = '200px';
            dropdown.style.overflowY = 'auto';
            dropdown.style.background = 'white';
            dropdown.style.border = '1px solid #ccc';
            dropdown.style.zIndex = '1000';
            
            // Удаляем существующий выпадающий список если есть
            const existingDropdown = container.querySelector('.multi-select-dropdown');
            if (existingDropdown) existingDropdown.remove();
            
            // Добавляем результаты поиска
            items.forEach(item => {
                // Проверяем, не выбран ли уже этот элемент
                const isAlreadySelected = Array.from(itemsList.querySelectorAll('.selected-item'))
                    .some(selectedItem => selectedItem.dataset.id == item.id);
                
                if (isAlreadySelected) return;
                
                const option = document.createElement('div');
                option.className = 'multi-select-option';
                option.textContent = item.value;
                option.dataset.id = item.id;
                option.dataset.value = item.value;
                option.style.padding = '8px 12px';
                option.style.cursor = 'pointer';
                option.style.borderBottom = '1px solid #eee';
                
                option.addEventListener('mouseover', function() {
                    this.style.backgroundColor = '#f5f5f5';
                });
                
                option.addEventListener('mouseout', function() {
                    this.style.backgroundColor = 'white';
                });
                
                option.addEventListener('click', function() {
                    addSelectedItem(this.dataset.id, this.dataset.value);
                    inputField.value = '';
                    dropdown.remove();
                });
                
                dropdown.appendChild(option);
            });
            
            if (items.length > 0) {
                container.appendChild(dropdown);
            }
        });
        
        // Функция добавления выбранного элемента
        function addSelectedItem(id, value) {
            const item = document.createElement('div');
            item.className = 'selected-item';
            item.dataset.id = id;
            item.dataset.value = value;
            item.style.display = 'inline-block';
            item.style.padding = '4px 8px';
            item.style.margin = '4px';
            item.style.background = '#f1f1f1';
            item.style.borderRadius = '4px';
            
            const itemText = document.createElement('span');
            itemText.textContent = value;
            item.appendChild(itemText);
            
            const removeBtn = document.createElement('span');
            removeBtn.innerHTML = '&times;';
            removeBtn.style.marginLeft = '6px';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.fontWeight = 'bold';
            removeBtn.addEventListener('click', function() {
                item.remove();
                updateHiddenInput();
            });
            
            item.appendChild(removeBtn);
            itemsList.appendChild(item);
            
            updateHiddenInput();
        }
        
        // Функция обновления скрытого поля с выбранными значениями
        function updateHiddenInput() {
            const selectedItems = itemsList.querySelectorAll('.selected-item');
            hiddenInput.value = Array.from(selectedItems)
                .map(item => item.dataset.id)
                .join(',');
            
            // Генерируем событие изменения для возможных обработчиков
            const event = new Event('change');
            hiddenInput.dispatchEvent(event);
        }
        
        // Скрытие выпадающего списка при клике вне контейнера
        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                const dropdown = container.querySelector('.multi-select-dropdown');
                if (dropdown) dropdown.remove();
            }
        });
        
        // Инициализация для режима редактирования
        if (onInitCallback) {
            setTimeout(onInitCallback, 500);
        }
    }
    
    // Функция загрузки выбранных стран для режима редактирования
    async function loadSelectedCountries() {
        if (!isEditMode) return;
        
        try {
            const { data, error } = await supabaseClient
                .from('service_country')
                .select('country_id, country_name')
                .eq('service_id', editId);
            
            if (!error && data && data.length > 0) {
                const countriesList = document.getElementById('countrys-list');
                const selectedCountrys = document.getElementById('selected_countrys');
                
                if (!countriesList || !selectedCountrys) return;
                
                data.forEach(country => {
                    const item = document.createElement('div');
                    item.className = 'selected-item';
                    item.dataset.id = country.country_id;
                    item.dataset.value = country.country_name;
                    item.style.display = 'inline-block';
                    item.style.padding = '4px 8px';
                    item.style.margin = '4px';
                    item.style.background = '#f1f1f1';
                    item.style.borderRadius = '4px';
                    
                    const itemText = document.createElement('span');
                    itemText.textContent = country.country_name;
                    item.appendChild(itemText);
                    
                    const removeBtn = document.createElement('span');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.style.marginLeft = '6px';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.style.fontWeight = 'bold';
                    removeBtn.addEventListener('click', function() {
                        item.remove();
                        // Обновить скрытое поле
                        selectedCountrys.value = Array.from(countriesList.querySelectorAll('.selected-item'))
                            .map(item => item.dataset.id)
                            .join(',');
                        
                        // Вызвать событие change
                        const event = new Event('change');
                        selectedCountrys.dispatchEvent(event);
                    });
                    
                    item.appendChild(removeBtn);
                    countriesList.appendChild(item);
                });
                
                // Обновить скрытое поле
                selectedCountrys.value = Array.from(countriesList.querySelectorAll('.selected-item'))
                    .map(item => item.dataset.id)
                    .join(',');
            }
        } catch (error) {
            console.error('Ошибка при загрузке выбранных стран:', error);
        }
    }
    
    // Функция загрузки выбранных городов для режима редактирования
    async function loadSelectedCities() {
        if (!isEditMode) return;
        
        try {
            const { data, error } = await supabaseClient
                .from('service_city')
                .select('city_id, city_name')
                .eq('service_id', editId);
            
            if (!error && data && data.length > 0) {
                const citiesList = document.getElementById('citys-list');
                const selectedCitys = document.getElementById('selected_citys');
                
                if (!citiesList || !selectedCitys) return;
                
                data.forEach(city => {
                    const item = document.createElement('div');
                    item.className = 'selected-item';
                    item.dataset.id = city.city_id;
                    item.dataset.value = city.city_name;
                    item.style.display = 'inline-block';
                    item.style.padding = '4px 8px';
                    item.style.margin = '4px';
                    item.style.background = '#f1f1f1';
                    item.style.borderRadius = '4px';
                    
                    const itemText = document.createElement('span');
                    itemText.textContent = city.city_name;
                    item.appendChild(itemText);
                    
                    const removeBtn = document.createElement('span');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.style.marginLeft = '6px';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.style.fontWeight = 'bold';
                    removeBtn.addEventListener('click', function() {
                        item.remove();
                        // Обновить скрытое поле
                        selectedCitys.value = Array.from(citiesList.querySelectorAll('.selected-item'))
                            .map(item => item.dataset.id)
                            .join(',');
                    });
                    
                    item.appendChild(removeBtn);
                    citiesList.appendChild(item);
                });
                
                // Обновить скрытое поле
                selectedCitys.value = Array.from(citiesList.querySelectorAll('.selected-item'))
                    .map(item => item.dataset.id)
                    .join(',');
            }
        } catch (error) {
            console.error('Ошибка при загрузке выбранных городов:', error);
        }
    }
