// frontend/script.js (部分修改和新增)

// ... (之前的JS代码) ...

    let currentArrangement = { front: null, middle: null, rear: null, isValid: false };

    async function updateAndEvaluateSets() {
        const frontSetCards = getCardsFromDiv(frontSetDiv);
        const middleSetCards = getCardsFromDiv(middleSetDiv);
        const rearSetCards = getCardsFromDiv(rearSetDiv);

        document.getElementById('frontSetType').textContent = `(${frontSetCards.length}张)`;
        document.getElementById('middleSetType').textContent = `(${middleSetCards.length}张)`;
        document.getElementById('rearSetType').textContent = `(${rearSetCards.length}张)`;

        if (frontSetCards.length === 3 && middleSetCards.length === 5 && rearSetCards.length === 5) {
            try {
                const data = await apiRequest('evaluate_player_sets', {
                    front: frontSetCards,
                    middle: middleSetCards,
                    rear: rearSetCards
                }, 'POST', true);

                if (data.success) {
                    currentArrangement.front = data.front_set;
                    currentArrangement.middle = data.middle_set;
                    currentArrangement.rear = data.rear_set;
                    currentArrangement.isValid = data.is_valid;

                    document.getElementById('frontSetType').textContent = data.front_set.name;
                    document.getElementById('middleSetType').textContent = data.middle_set.name;
                    document.getElementById('rearSetType').textContent = data.rear_set.name;
                    
                    showMessage(arrangementMessage, data.message, data.is_valid);
                } else {
                    showMessage(arrangementMessage, data.error || '评估失败', false);
                    currentArrangement.isValid = false;
                }
            } catch (error) {
                showMessage(arrangementMessage, `评估请求错误: ${error.message}`, false);
                currentArrangement.isValid = false;
            }
        } else {
            currentArrangement.isValid = false; // Not a full arrangement
             if (frontSetCards.length > 0 || middleSetCards.length > 0 || rearSetCards.length > 0) {
                // Only clear message if user actually started arranging
                showMessage(arrangementMessage, '请正确摆放三道牌 (3-5-5)。', false);
            }
        }
        validateSetsState(); // Re-validate submit button state
    }

    // Modify enableDragAndDrop to call updateAndEvaluateSets on drop
    function enableDragAndDrop() {
        // ... (dragstart, dragend, dragover, dragleave are the same) ...
        droppableAreas.forEach(area => {
            // ... (dragover, dragleave are the same) ...
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                if (draggedCard) {
                    const maxCards = parseInt(area.dataset.maxCards) || Infinity;
                    if (area.children.length < maxCards || (area.id === 'playerHand' && !area.contains(draggedCard))) {
                        if (draggedCard.parentElement !== area) {
                             if (area.id === 'playerHand' || area.classList.contains('set-area')) {
                                area.appendChild(draggedCard);
                            }
                        }
                    } else if (area.children.length >= maxCards && area.id !== 'playerHand') {
                         showMessage(arrangementMessage, `${area.id === 'frontSet' ? '头道' : area.id === 'middleSet' ? '中道' : '尾道'} 已满!`, false);
                    }
                }
                // Call evaluation after a drop occurs and DOM is updated
                updateAndEvaluateSets(); // ⭐ NEW: Evaluate after drop
            });
        });
        // Initial call if cards might already be in sets (e.g., after AI arrange)
        updateAndEvaluateSets();
    }

    function validateSetsState() {
        const frontCardsCount = frontSetDiv.children.length;
        const middleCardsCount = middleSetDiv.children.length;
        const rearCardsCount = rearSetDiv.children.length;
        const totalInSets = frontCardsCount + middleCardsCount + rearCardsCount;
        const handCardsCount = playerHandDiv.children.length;

        if (totalInSets === 13 && handCardsCount === 0 &&
            frontCardsCount === 3 && middleCardsCount === 5 && rearCardsCount === 5 &&
            currentArrangement.isValid) { // ⭐ Check if arrangement is valid (not "倒水")
            submitHandButton.disabled = false;
            // Message is already handled by updateAndEvaluateSets
        } else {
            submitHandButton.disabled = true;
            if (totalInSets + handCardsCount === 13 && handCardsCount > 0) {
                 if (arrangementMessage.textContent.includes('倒水')) {
                    // Keep the "倒水" message
                } else {
                    showMessage(arrangementMessage, '请将所有13张牌放入三道中。', false);
                }
            } else if (totalInSets === 13 && handCardsCount === 0 && (frontCardsCount !== 3 || middleCardsCount !== 5 || rearCardsCount !== 5)) {
                showMessage(arrangementMessage, '请确保头道3张，中道5张，尾道5张。', false);
            } else if (totalInSets === 13 && handCardsCount === 0 && !currentArrangement.isValid && !arrangementMessage.textContent.includes('评估失败')) {
                // Message about "倒水" should already be there from updateAndEvaluateSets
                // If not, it means evaluation hasn't run or there's another issue
            }
        }
    }

    // In fetchAndDisplayHand, after displaying cards:
    async function fetchAndDisplayHand() {
        // ... (dealButton disabled, clear old stuff) ...
        try {
            const data = await apiRequest('deal', {}, 'GET', true);
            if (data.hand && data.image_base_path) {
                currentHand = data.hand;
                displayCards(currentHand, data.image_base_path, playerHandDiv);
                enableDragAndDrop(); // This will also call updateAndEvaluateSets initially
                autoArrangeButton.disabled = false;
            } else { /* ... error handling ... */ }
        } catch (error) { /* ... error handling ... */ }
        finally { /* ... dealButton enabled ... */ }
    }

// ... (rest of script.js)
