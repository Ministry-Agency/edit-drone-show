document.addEventListener("DOMContentLoaded", async function () {
    if (typeof supabase === "undefined") return;

    const SUPABASE_URL = 'https://jymaupdlljtwjxiiistn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bWF1cGRsbGp0d2p4aWlpc3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MTcxMTgsImV4cCI6MjA1NDQ5MzExOH0.3K22PNYIHh8NCreiG0NBtn6ITFrL3cVmSS5KCG--niY';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    window.uploadedFiles = [];
    const editId = localStorage.getItem('edit_id');
    let isEditMode = !!editId;

    const form = document.querySelector('form[name="email-form"][action*="webhook"]');
    if (!form) return;
    
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
        },
        // Add new configuration for service types
        type: {
            table: 'service_types',
            valueField: 'type_name',
            idField: 'id',
            filterField: null // Not filtered by any field
        }
    };

    async function initializeSelect(dataName) {
        const config = selectorsConfig[dataName];
        if (!config) return;

        async function updateSelectOptions() {
            try {
                let data;
                let error;

                // For type selector, we don't need to filter by category
                if (dataName === 'type') {
                    const result = await supabaseClient
                        .from(config.table)
                        .select(`${config.valueField}, ${config.idField}`);
                    
                    data = result.data;
                    error = result.error;
                } else {
                    // For other selectors that depend on main_category
                    const categoryInput = document.querySelector('input[name="main_category"]');
                    if (!categoryInput) return;

                    const categoryValue = categoryInput.value;

                    const result = await supabaseClient
                        .from(config.table)
                        .select(`${config.valueField}, ${config.idField}`)
                        .eq(config.filterField, categoryValue);
                    
                    data = result.data;
                    error = result.error;
                }

                if (error || !data || data.length === 0) return;

                // Find the right selector based on dataName
                let multiSelect;
                if (dataName === 'type') {
                    multiSelect = document.querySelector('input[name="type"]');
                } else {
                    multiSelect = document.querySelector(`input[data-name="${dataName}"]`);
                }
                
                if (!multiSelect) return;
                
                const wrapper = multiSelect.closest('[ms-code-select-wrapper="multi"]');
                if (!wrapper) return;

                wrapper.innerHTML = `
                    <input 
                        class="creating-form_field w-input" 
                        ms-code-select-options="${data.map(item => item[config.valueField]).join(', ')}" 
                        autocomplete="off" 
                        maxlength="256" 
                        type="text"
                        name="${dataName}" 
                        data-name="${dataName}"
                        id="${dataName}"
                        data-ms-member="${dataName}"
                        placeholder="Select ${dataName}" 
                        ms-code-select="input"
                        style="cursor: pointer; background-color: #fff;"
                        ${dataName === 'type' ? 'required="required"' : ''}>
                    <input 
                        type="hidden" 
                        name="${dataName}_id" 
                        id="${dataName}_id" 
                        data-ms-member="${dataName}_id"
                        data-name="${dataName}_id">
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
                
                const hiddenInput = wrapper.querySelector(`input[name="${dataName}_id"]`);
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
                        
                        // For type selector, we only allow one selection
                        if (dataName === 'type') {
                            selectedWrapper.innerHTML = '';
                        }
                        
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
                        
                        // For type selector, hide all options
                        if (dataName === 'type') {
                            list.querySelectorAll('[ms-code-select="tag-name-new"]').forEach(opt => {
                                opt.style.display = 'none';
                            });
                        } else {
                            this.style.display = 'none';
                        }
                        
                        updateInputValues();

                        tag.querySelector('[ms-code-select="tag-close"]').addEventListener('click', function(e) {
                            e.stopPropagation();
                            
                            // For type selector, show all options again
                            if (dataName === 'type') {
                                list.querySelectorAll('[ms-code-select="tag-name-new"]').forEach(opt => {
                                    opt.style.display = 'block';
                                });
                            } else {
                                Array.from(list.querySelectorAll('[ms-code-select="tag-name-new"]'))
                                    .find(opt => opt.dataset.value === value)
                                    .style.display = 'block';
                            }
                            
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
                        } else if (dataName === 'type') {
                            // For type, we get it directly from the service or service_categories table
                            if (editId) {
                                const { data: categoryData } = await supabaseClient
                                    .from('service_categories')
                                    .select('category_id, category_name')
                                    .eq('service_id', editId)
                                    .single();
                                
                                if (categoryData) {
                                    const id = categoryData.category_id;
                                    const value = categoryData.category_name;
                                    
                                    selectTypeOption(id, value);
                                }
                                
                                return;
                            }
                        }

                        if (dataName !== 'type') {
                            // Special handling for drones to make sure we get all the drone data
                            if (dataName === 'drones') {
                                console.log('Loading drones data for service ID:', editId);
                                
                                const { data: dronesData, error: dronesError } = await supabaseClient
                                    .from('service_drones')
                                    .select('drone_id, drone_name')
                                    .eq('service_id', editId);
                                
                                if (dronesError) {
                                    console.error('Error loading drones data:', dronesError);
                                    return;
                                }
                                
                                if (dronesData && dronesData.length > 0) {
                                    console.log('Found drones data:', dronesData);
                                    
                                    // Clear any existing selections
                                    selectedWrapper.innerHTML = '';
                                    
                                    // Reset all options visibility
                                    list.querySelectorAll('[ms-code-select="tag-name-new"]').forEach(opt => {
                                        opt.style.display = 'block';
                                    });
                                    
                                    dronesData.forEach(drone => {
                                        const id = drone.drone_id;
                                        const value = drone.drone_name;
                                        
                                        if (!id || !value) return;
                                        
                                        const optionsList = list.querySelectorAll('[ms-code-select="tag-name-new"]');
                                        let found = false;
                                        
                                        for (let i = 0; i < optionsList.length; i++) {
                                            const option = optionsList[i];
                                            
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
                                                
                                                const closeBtn = tag.querySelector('[ms-code-select="tag-close"]');
                                                closeBtn.addEventListener('click', function(e) {
                                                    e.stopPropagation();
                                                    option.style.display = 'block';
                                                    tag.remove();
                                                    updateInputValues();
                                                });
                                                
                                                break;
                                            }
                                        }
                                        
                                        if (!found) {
                                            // If the drone is not in the current options list, add it anyway
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
                                } else {
                                    console.log('No drones data found for service ID:', editId);
                                }
                            } else {
                                // Standard handling for other multi-selectors
                                const { data: selected, error: selectedError } = await supabaseClient
                                    .from(table)
                                    .select(`${idField}, ${nameField}`)
                                    .eq('service_id', editId);

                                if (!selectedError && selected && selected.length > 0) {
                                    selected.forEach(item => {
                                        const id = item[idField];
                                        const value = item[nameField];
                                        
                                        if (!id || !value) return;
                                        
                                        const optionsList = list.querySelectorAll('[ms-code-select="tag-name-new"]');
                                        let found = false;
                                        
                                        for (let i = 0; i < optionsList.length; i++) {
                                            const option = optionsList[i];
                                            
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
                                                
                                                const closeBtn = tag.querySelector('[ms-code-select="tag-close"]');
                                                closeBtn.addEventListener('click', function(e) {
                                                    e.stopPropagation();
                                                    option.style.display = 'block';
                                                    tag.remove();
                                                    updateInputValues();
                                                });
                                                
                                                break;
                                            }
                                        }
                                        
                                        if (!found) {
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
                            }
                        }
                    }, 500);
                }

            } catch (error) {
                console.error('Error initializing select:', error);
            }
        }

        // Helper function to select a type option
        function selectTypeOption(id, value) {
            const typeWrapper = document.querySelector(`input[name="type"]`).closest('[ms-code-select-wrapper="multi"]');
            if (!typeWrapper) return;
            
            const list = typeWrapper.querySelector('[ms-code-select="list"]');
            const selectedWrapper = list.querySelector('[ms-code-select="selected-wrapper"]');
            const displayInput = typeWrapper.querySelector('[ms-code-select="input"]');
            const hiddenInput = typeWrapper.querySelector(`input[name="type_id"]`);
            
            // Clear any existing selection
            selectedWrapper.innerHTML = '';
            
            // Create new tag
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
            
            // Hide all options
            list.querySelectorAll('[ms-code-select="tag-name-new"]').forEach(opt => {
                opt.style.display = 'none';
            });
            
            // Update input values
            displayInput.value = value;
            hiddenInput.value = id;
            
            // Add click event for the close button
            tag.querySelector('[ms-code-select="tag-close"]').addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Show all options again
                list.querySelectorAll('[ms-code-select="tag-name-new"]').forEach(opt => {
                    opt.style.display = 'block';
                });
                
                tag.remove();
                displayInput.value = '';
                hiddenInput.value = '';
            });
        }

        // For type selector, we don't need to listen to main_category changes
        if (dataName !== 'type') {
            const categoryInput = document.querySelector('input[name="main_category"]');
            if (categoryInput) {
                categoryInput.addEventListener('change', updateSelectOptions);
            }
        }

        await updateSelectOptions();
    }

    async function loadServiceData(serviceId) {
        try {
            const { data: serviceData, error: serviceError } = await supabaseClient
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .single();
            
            if (serviceError || !serviceData) return;

            const { data: categoryData } = await supabaseClient
                .from('service_categories')
                .select('category_id, category_name')
                .eq('service_id', serviceId)
                .single();

            const { data: pricesData } = await supabaseClient
                .from('show_steps')
                .select('*')
                .eq('service_id', serviceId)
                .order('id', { ascending: true });
            
            const { data: dronesData } = await supabaseClient
                .from('service_drones')
                .select('drone_id, drone_name')
                .eq('service_id', serviceId);
                
            const { data: includedData } = await supabaseClient
                .from('service_includes')
                .select('included_id, included_name')
                .eq('service_id', serviceId);
                
            const { data: countriesData } = await supabaseClient
                .from('service_country')
                .select('id, service_id, country')
                .eq('service_id', serviceId);
                
            const { data: citiesData } = await supabaseClient
                .from('service_city')
                .select('id, service_id, city')
                .eq('service_id', serviceId);

            // Get all available categories for the dropdown
            const { data: allCategories } = await supabaseClient
                .from('categories')
                .select('id, name')
                .order('name', { ascending: true });

            fillFormWithData(
                serviceData, 
                categoryData, 
                pricesData || [], 
                dronesData || [], 
                includedData || [],
                countriesData || [],
                citiesData || [],
                allCategories || []
            );

        } catch (error) {
            console.error('Error loading service data:', error);
        }
    }

    function fillFormWithData(service, category, prices, drones, included, countries, cities, allCategories) {
        const serviceNameSelectors = [
            '#service-name-5',
            'input[name="service-name"]',
            'input[data-name="service-name"]',
            'input[name="name"]',
            'input[data-name="name"]'
        ];
        
        let serviceNameInput = null;
        for (const selector of serviceNameSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                serviceNameInput = element;
                break;
            }
        }
        
        if (serviceNameInput && service.name) {
            serviceNameInput.value = service.name;
        }

        const descriptionInput = document.querySelector('textarea[name="service_description"], textarea[data-name="service_description"]');
        if (descriptionInput && service.service_description) {
            descriptionInput.value = service.service_description;
        }

        // Handle the category dropdown
        const categorySelect = document.querySelector('select[name="category"], select[data-name="category"]');
        if (categorySelect && allCategories && allCategories.length > 0) {
            // Clear existing options except the first empty option
            while (categorySelect.options.length > 1) {
                categorySelect.remove(1);
            }
            
            // Add all available categories
            allCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
            
            // Set the selected category if available
            if (category && category.category_id) {
                categorySelect.value = category.category_id;
                
                // Create or update hidden input for category_id if needed
                let categoryIdInput = document.querySelector('input[name="category_id"]');
                if (!categoryIdInput) {
                    categoryIdInput = document.createElement('input');
                    categoryIdInput.type = 'hidden';
                    categoryIdInput.name = 'category_id';
                    form.appendChild(categoryIdInput);
                }
                categoryIdInput.value = category.category_id;
                
                // Also update the type selector if it exists
                const typeInput = document.querySelector('input[name="type"], input[data-name="type"]');
                if (typeInput) {
                    typeInput.value = category.category_name;
                }
            }
        }

        // Handle the type input (if separate from category)
        if (category && !categorySelect) {
            const typeInput = document.querySelector('input[name="type"], input[data-name="type"]');
            if (typeInput) {
                typeInput.value = category.category_name;
                
                let categoryIdInput = document.querySelector('input[name="category_id"], input[name="type_id"]');
                if (!categoryIdInput) {
                    categoryIdInput = document.createElement('input');
                    categoryIdInput.type = 'hidden';
                    categoryIdInput.name = 'category_id';
                    form.appendChild(categoryIdInput);
                }
                categoryIdInput.value = category.category_id;
            }
        }

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
                    updateGallery();
                }
            } catch (error) {
                console.error('Error parsing image URLs:', error);
            }
        }

        const approvalTimeInput = document.getElementById('approval_time');
        if (approvalTimeInput && service.approval_time_required) {
            approvalTimeInput.value = service.approval_time_required;
        }

        const costPerShowInput = document.getElementById('cost_per_show');
        if (costPerShowInput && service.cost_per_drone_show) {
            costPerShowInput.value = service.cost_per_drone_show;
        }

        const costPerShowNoAnimInput = document.querySelector('input[name="cost_per_drone_shownoanim"], input[id="cost_per_showwithoutanim"]');
        if (costPerShowNoAnimInput && service.cost_per_drone_shownoanim) {
            costPerShowNoAnimInput.value = service.cost_per_drone_shownoanim;
        }

        const costPerCrewInput = document.getElementById('cost_per_crew');
        if (costPerCrewInput && service.cost_per_crew) {
            costPerCrewInput.value = service.cost_per_crew;
        }

        const operatorsInput = document.getElementById('number_of_operators');
        if (operatorsInput && service.operators_number) {
            operatorsInput.value = service.operators_number;
        }

        const droneShowMinInput = document.getElementById('drone_show_min_num');
        const droneShowMaxInput = document.getElementById('drone_show_max_num');
        const droneShowStepInput = document.getElementById('drone_show_step');
        
        if (prices && prices.length > 0) {
            const steps = prices.map(p => parseInt(p.step) || 0).filter(s => s > 0);
            if (steps.length > 0) {
                const min = Math.min(...steps);
                const max = Math.max(...steps);
                const step = (steps.length > 1) ? steps[1] - steps[0] : 100;
                
                if (droneShowMinInput) droneShowMinInput.value = min;
                if (droneShowMaxInput) droneShowMaxInput.value = max;
                if (droneShowStepInput) droneShowStepInput.value = step;
            }
        }
        
        if (countries && countries.length > 0) {
            const countryContainer = document.getElementById('countrys-container');
            if (countryContainer) {
                const countryList = document.getElementById('countrys-list');
                const selectedCountriesInput = document.getElementById('selected_countrys');
                
                if (countryList && selectedCountriesInput) {
                    countryList.innerHTML = '';
                    
                    const countryIds = [];
                    
                    countries.forEach(country => {
                        const id = country.id;
                        const name = country.country;
                        
                        if (!id || !name) return;
                        
                        countryIds.push(id);
                        
                        const tag = document.createElement('div');
                        tag.className = 'selected-tag';
                        tag.innerHTML = `
                            <span>${name}</span>
                            <button type="button" class="tag-remove" data-id="${id}">×</button>
                        `;
                        
                        tag.querySelector('.tag-remove').addEventListener('click', function() {
                            tag.remove();
                            const idx = countryIds.indexOf(id);
                            if (idx !== -1) {
                                countryIds.splice(idx, 1);
                            }
                            selectedCountriesInput.value = countryIds.join(',');
                        });
                        
                        countryList.appendChild(tag);
                    });
                    
                    selectedCountriesInput.value = countryIds.join(',');
                }
            }
        }
        
        if (cities && cities.length > 0) {
            const cityContainer = document.getElementById('citys-container');
            if (cityContainer) {
                const cityList = document.getElementById('citys-list');
                const selectedCitiesInput = document.getElementById('selected_citys');
                
                if (cityList && selectedCitiesInput) {
                    cityList.innerHTML = '';
                    
                    const cityIds = [];
                    
                    cities.forEach(city => {
                        const id = city.id;
                        const name = city.city;
                        
                        if (!id || !name) return;
                        
                        cityIds.push(id);
                        
                        const tag = document.createElement('div');
                        tag.className = 'selected-tag';
                        tag.innerHTML = `
                            <span>${name}</span>
                            <button type="button" class="tag-remove" data-id="${id}">×</button>
                        `;
                        
                        tag.querySelector('.tag-remove').addEventListener('click', function() {
                            tag.remove();
                            const idx = cityIds.indexOf(id);
                            if (idx !== -1) {
                                cityIds.splice(idx, 1);
                            }
                            selectedCitiesInput.value = cityIds.join(',');
                        });
                        
                        cityList.appendChild(tag);
                    });
                    
                    selectedCitiesInput.value = cityIds.join(',');
                }
            }
        }

        const serviceIdInput = document.createElement('input');
        serviceIdInput.type = 'hidden';
        serviceIdInput.name = 'service_id';
        serviceIdInput.value = service.id;
        form.appendChild(serviceIdInput);
        
        form.action = 'https://n8n.thewowdrone.com/webhook/edit-a-service-drone-show';
        
        const submitButton = form.querySelector('input[type="submit"]');
        if (submitButton) {
            submitButton.value = 'UPDATE';
        }
    }

    function updateGallery() {
        if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
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

    function displayVideoInElement(file, imgElement) {
        if (!file || !imgElement) return;
        
        imgElement.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23cccccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2214px%22%20fill%3D%22%23333333%22%3ELoading...%3C%2Ftext%3E%3C%2Fsvg%3E';
        
        if (typeof file === 'string') {
            imgElement.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23333333%22%2F%3E%3Cpath%20d%3D%22M20%2C10%20L50%2C30%20L20%2C50%20Z%22%20fill%3D%22white%22%2F%3E%3C%2Fsvg%3E';
            return;
        }
        
        generateVideoThumbnail(file, imgElement);
    }

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
            } catch (e) {}
            
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
        } catch (e) {}
    }

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

    function handleDeleteImage(event) {
        const deleteBtn = event.target;
        const parentItem = deleteBtn.closest('.service-gallery-img-item, .service-gallery-img-big-wrapper');
        
        if (!parentItem) return;
        
        const isBigImage = parentItem.classList.contains('service-gallery-img-big-wrapper');
        
        if (isBigImage) {
            const deletedImage = window.uploadedFiles[0];
            window.uploadedFiles.splice(0, 1);
            
            if (typeof deletedImage === 'string' && !window.deletedImages) {
                window.deletedImages = [deletedImage];
            } else if (typeof deletedImage === 'string') {
                window.deletedImages.push(deletedImage);
            }
        } else {
            const smallImageItems = Array.from(document.querySelectorAll('.service-gallery-img-item'));
            const index = smallImageItems.indexOf(parentItem);
            
            if (index !== -1) {
                const realIndex = index + 1;
                const deletedImage = window.uploadedFiles[realIndex];
                window.uploadedFiles.splice(realIndex, 1);
                
                if (typeof deletedImage === 'string' && !window.deletedImages) {
                    window.deletedImages = [deletedImage];
                } else if (typeof deletedImage === 'string') {
                    window.deletedImages.push(deletedImage);
                }
            }
        }
        
        updateGallery();
    }

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

    async function initPage() {
        // Initialize category dropdown
        const categorySelect = document.querySelector('select[name="category"], select[data-name="category"]');
        if (categorySelect) {
            try {
                const { data: categories, error } = await supabaseClient
                    .from('categories')
                    .select('id, name')
                    .order('name', { ascending: true });
                
                if (!error && categories && categories.length > 0) {
                    // Clear existing options except the first empty option
                    while (categorySelect.options.length > 1) {
                        categorySelect.remove(1);
                    }
                    
                    // Add all available categories
                    categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.name;
                        categorySelect.appendChild(option);
                    });
                    
                    // Add change event to update the main category if needed
                    categorySelect.addEventListener('change', function() {
                        const selectedCategoryId = this.value;
                        const selectedCategoryName = this.options[this.selectedIndex].text;
                        
                        // Update hidden fields
                        let categoryIdInput = document.querySelector('input[name="category_id"]');
                        if (!categoryIdInput) {
                            categoryIdInput = document.createElement('input');
                            categoryIdInput.type = 'hidden';
                            categoryIdInput.name = 'category_id';
                            form.appendChild(categoryIdInput);
                        }
                        categoryIdInput.value = selectedCategoryId;
                        
                        // Update type field if present
                        const typeInput = document.querySelector('input[name="type"], input[data-name="type"]');
                        if (typeInput) {
                            typeInput.value = selectedCategoryName;
                        }
                        
                        // Find and update main_category field if it exists
                        const mainCategoryInput = document.querySelector('input[name="main_category"]');
                        if (mainCategoryInput) {
                            // Fetch the main category for this category
                            supabaseClient
                                .from('category_main_category')
                                .select('main_category_name')
                                .eq('category_id', selectedCategoryId)
                                .single()
                                .then(({ data }) => {
                                    if (data && data.main_category_name) {
                                        mainCategoryInput.value = data.main_category_name;
                                        // Trigger change event to update dependent selectors
                                        const event = new Event('change');
                                        mainCategoryInput.dispatchEvent(event);
                                    }
                                });
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }
        
        if (isEditMode) {
            await loadServiceData(editId);
            
            // Initialize all multi-selectors
            await initializeSelect('type');
            await initializeSelect('included');
            await initializeSelect('drones');
            await initializeSelect('software');
        } else {
            // Initialize all multi-selectors for new service
            await initializeSelect('type');
            await initializeSelect('included');
            await initializeSelect('drones');
            await initializeSelect('software');
        }
        
        setupGallery();
        
        window.addEventListener('resize', updateAddMoreButtonSize);
    }
    
    initPage();
});
