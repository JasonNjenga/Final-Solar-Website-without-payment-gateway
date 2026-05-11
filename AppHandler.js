// ====================== SUPABASE INIT ======================
const { createClient } = supabase;
const supabaseClient = createClient(
    "https://cxqgkmjgpoftlbunetjj.supabase.co",
    "sb_publishable_Z3peI2WQS-vvjtAf30mUkw_Bi1hgzA_"
);

// ====================== DOM READY ======================
document.addEventListener('DOMContentLoaded', () => {

    // --- Auth listeners ---
    document.getElementById('login-button').addEventListener('click', openAuthModal);
    document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);
    document.getElementById('auth-overlay').addEventListener('click', closeAuthModal);
    document.getElementById('logout-button').addEventListener('click', signOut);

    document.getElementById('tab-signin').addEventListener('click', () => switchTab('signin'));
    document.getElementById('tab-signup').addEventListener('click', () => switchTab('signup'));

    document.getElementById('signin-form').addEventListener('submit', handleSignIn);
    document.getElementById('signup-form').addEventListener('submit', handleSignUp);
    document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);

    // Check current session on load
    checkSession();

    // Listen for auth state changes (e.g. email confirmation redirects)
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session && session.user) {
            updateUILoggedIn(session.user);
        } else {
            updateUILoggedOut();
        }
    });

    // --- Nav scroll ---
    let navElement = document.querySelector('nav');
    document.addEventListener('scroll', () => { navScrollEffect(navElement); });

    // --- Cart ---
    document.querySelector('nav .cart-button').addEventListener('click', openCartView);
    document.querySelector('#cart-box .close-button').addEventListener('click', closeCartView);

    // --- Customer form ---
    document.querySelector('#close-customer-form').addEventListener('click', closeCustomerForm);
    document.querySelector('#back-to-cart').addEventListener('click', goBackToCart);

    // --- Add to cart ---
    let userCart = document.querySelector('#cart-items-container ul');
    document.querySelectorAll('.order-button').forEach((bttn) => {
        bttn.addEventListener('click', () => { addToCart(userCart, bttn); });
    });

    userCart.addEventListener('scroll', () => { cartScrollEffect(userCart); });

    userCart.addEventListener('click', (e) => {
        let targetElement = e.target.closest('.remove-button');
        if (targetElement) { removeCartItem(targetElement); }
    });

    document.querySelector('#checkout-button').addEventListener('click', () => { openCustomerForm(); });
    document.querySelector('#customerDetailsForm').addEventListener('submit', (e) => { payWithPaystack(e); });

    emptyCartMessage();
});

// ====================== AUTH MODAL ======================
function openAuthModal() {
    document.getElementById('auth-modal').classList.add('active');
    switchTab('signin');
    clearAuthMessage();
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    clearAuthMessage();
    document.getElementById('signin-form').reset();
    document.getElementById('signup-form').reset();
}

function switchTab(tab) {
    const signinTab = document.getElementById('tab-signin');
    const signupTab = document.getElementById('tab-signup');
    const signinPanel = document.getElementById('panel-signin');
    const signupPanel = document.getElementById('panel-signup');
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');

    clearAuthMessage();

    if (tab === 'signin') {
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
        signinPanel.classList.add('active');
        signupPanel.classList.remove('active');
        modalTitle.textContent = 'Welcome Back';
        modalSubtitle.textContent = 'Sign in to continue shopping';
    } else {
        signupTab.classList.add('active');
        signinTab.classList.remove('active');
        signupPanel.classList.add('active');
        signinPanel.classList.remove('active');
        modalTitle.textContent = 'Create Account';
        modalSubtitle.textContent = 'Join MySolarShop today';
    }
}

// ====================== SESSION CHECK ======================
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        updateUILoggedIn(session.user);
    } else {
        updateUILoggedOut();
    }
}

// ====================== UPDATE UI ======================
function updateUILoggedIn(user) {
    const email = user.email || '';
    const initials = getInitials(email);

    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('login-button').style.display = 'none';

    const profile = document.getElementById('user-profile');
    profile.classList.remove('hidden');
    profile.style.display = 'flex';

    document.getElementById('user-avatar-initials').textContent = initials;
    document.getElementById('user-email-display').textContent = email;

    // Pre-fill checkout form email if empty
    const checkoutEmail = document.getElementById('email-address');
    if (checkoutEmail && !checkoutEmail.value) {
        checkoutEmail.value = email;
    }
}

function updateUILoggedOut() {
    const loginBtn = document.getElementById('login-button');
    loginBtn.classList.remove('hidden');
    loginBtn.style.display = 'flex';

    const profile = document.getElementById('user-profile');
    profile.classList.add('hidden');
    profile.style.display = 'none';

    document.getElementById('user-avatar-initials').textContent = '';
    document.getElementById('user-email-display').textContent = '';
}

function getInitials(email) {
    if (!email) return '?';
    // Use first two letters of the part before @
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
}

// ====================== SIGN IN ======================
async function handleSignIn(e) {
    e.preventDefault();
    const email    = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const btn      = document.getElementById('signin-btn');

    btn.textContent = 'Signing in…';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        showAuthMessage('Login successful! Welcome back.', 'success');
        setTimeout(() => {
            closeAuthModal();
        }, 1200);
    } catch (err) {
        showAuthMessage(err.message || 'Invalid credentials. Please try again.', 'error');
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}

// ====================== SIGN UP ======================
async function handleSignUp(e) {
    e.preventDefault();

    const firstName  = document.getElementById('signup-first-name').value.trim();
    const lastName   = document.getElementById('signup-last-name').value.trim();
    const email      = document.getElementById('signup-email').value.trim();
    const phone      = document.getElementById('signup-phone').value.trim();
    const location   = document.getElementById('signup-location').value.trim();
    const password   = document.getElementById('signup-password').value;
    const confirmPass= document.getElementById('signup-confirm-password').value;
    const btn        = document.getElementById('signup-btn');

    if (password !== confirmPass) {
        showAuthMessage('Passwords do not match!', 'error');
        return;
    }
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters.', 'error');
        return;
    }

    btn.textContent = 'Creating account…';
    btn.disabled = true;

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { first_name: firstName, last_name: lastName } }
        });

        if (authError) throw authError;

        // Insert profile row
        if (authData.user) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .upsert({
                    id:                authData.user.id,
                    first_name:        firstName,
                    last_name:         lastName,
                    email:             email,
                    phone:             phone,
                    delivery_location: location,
                    updated_at:        new Date().toISOString()
                });

            if (profileError) {
                console.error('Profile insert error:', profileError);
            }
        }

        showAuthMessage('Account created! Please check your email to confirm.', 'success');
        document.getElementById('signup-form').reset();

        // Switch to sign in tab after 3s
        setTimeout(() => {
            switchTab('signin');
        }, 3000);

    } catch (err) {
        showAuthMessage(err.message || 'Sign up failed. Please try again.', 'error');
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

// ====================== GOOGLE SIGN IN ======================
async function signInWithGoogle() {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) throw error;
    } catch (err) {
        showAuthMessage(err.message || 'Google sign in failed.', 'error');
    }
}

// ====================== SIGN OUT ======================
async function signOut() {
    await supabaseClient.auth.signOut();
    updateUILoggedOut();
}

// ====================== AUTH MESSAGE HELPERS ======================
function showAuthMessage(text, type) {
    const el = document.getElementById('auth-message');
    el.textContent = text;
    el.className = `auth-message ${type}`;
}

function clearAuthMessage() {
    const el = document.getElementById('auth-message');
    el.textContent = '';
    el.className = 'auth-message hidden';
}

// ==================== NAV SCROLL ====================
function navScrollEffect(navElement) {
    if (window.scrollY > 0) {
        navElement.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
        navElement.style.paddingTop = '12px';
        navElement.style.paddingBottom = '12px';
    } else {
        navElement.style.boxShadow = 'none';
        navElement.style.paddingTop = '18px';
        navElement.style.paddingBottom = '18px';
    }
}

// ==================== CART OPEN / CLOSE ====================
function openCartView() {
    document.querySelector('#cart-window').classList.add('active');
}

function closeCartView() {
    document.querySelector('#cart-window').classList.remove('active');
}

// ==================== CUSTOMER DETAILS FORM ====================
function openCustomerForm() {
    let itemCount = document.querySelectorAll('#cart-items-container ul li').length;
    if (itemCount === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        return;
    }

    let totalPrice = document.querySelector('#cart-checkout .price').textContent;
    document.querySelector('#order-total-display').textContent = totalPrice;

    // Pre-fill email if user is logged in
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            const emailField = document.getElementById('email-address');
            if (emailField && !emailField.value) {
                emailField.value = session.user.email;
            }
        }
    });

    closeCartView();
    document.querySelector('#customer-details-window').classList.add('active');
}

function closeCustomerForm() {
    document.querySelector('#customer-details-window').classList.remove('active');
}

function goBackToCart() {
    document.querySelector('#customer-details-window').classList.remove('active');
    openCartView();
}

// ==================== ADD TO CART ====================
function addToCart(userCart, bttn) {
    let addItem = bttn.parentElement.parentElement;
    let addItemName  = addItem.querySelector('.product-text .title').textContent;
    let addItemPrice = addItem.querySelector('.product-text .price').textContent.substring(3);

    let emojiEl = addItem.querySelector('.product-emoji');
    let imgEl   = addItem.querySelector('.image-container img');
    let imageHTML = '';
    if (emojiEl) {
        imageHTML = `<span class="cart-item-emoji">${emojiEl.textContent}</span>`;
    } else if (imgEl) {
        imageHTML = `<img src="${imgEl.src}" alt="${addItemName}">`;
    }

    let newItemHTML = `
        <li>
            <div class="cart-item">
                <div class="item-1">
                    <div class="cart-item-image">
                        ${imageHTML}
                        <button class="remove-button">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div class="cart-item-desc">
                        <span>${addItemName}</span>
                        <span>Qty. 1</span>
                    </div>
                </div>
                <div class="cart-item-price">
                    <span>KES${Number(addItemPrice).toFixed(2)}</span>
                </div>
            </div>
        </li>
    `;

    userCart.innerHTML += newItemHTML;
    updateTotalPrice(Number(addItemPrice), "addItem");
    emptyCartMessage();
    newCartItemEffect();
    openCartView();
}

// ==================== CART SCROLL EFFECT ====================
function cartScrollEffect(userCart) {
    let topFade    = document.querySelector('.white-fade-overflow.top');
    let bottomFade = document.querySelector('.white-fade-overflow.bottom');
    topFade.style.opacity    = (userCart.scrollTop !== 0) ? "1" : "0";
    bottomFade.style.opacity = ((userCart.offsetHeight + userCart.scrollTop) >= userCart.scrollHeight) ? "0" : "1";
}

// ==================== REMOVE CART ITEM ====================
function removeCartItem(el) {
    let cartItem      = el.closest('li');
    let cartItemPrice = cartItem.querySelector('.cart-item-price span').textContent.substring(3);
    cartItem.remove();
    updateTotalPrice(Number(cartItemPrice), "removeItem");
    emptyCartMessage();
}

// ==================== UPDATE TOTAL PRICE ====================
function updateTotalPrice(itemPrice, operation) {
    let checkoutPrice = document.querySelector('#cart-checkout .price');
    let totalPrice    = Number(checkoutPrice.textContent.substring(3));

    if (operation === "addItem")         totalPrice += itemPrice;
    else if (operation === "removeItem") totalPrice -= itemPrice;
    else                                 totalPrice  = 0;

    checkoutPrice.textContent = `KES${totalPrice.toFixed(2)}`;
}

// ==================== EMPTY CART MESSAGE ====================
function emptyCartMessage() {
    let message   = document.querySelector('#cart-items-container .empty-cart-message');
    let itemCount = document.querySelectorAll('#cart-items-container ul li').length;
    message.style.display = (itemCount === 0) ? 'block' : 'none';
}

// ==================== NEW ITEM ANIMATION ====================
function newCartItemEffect() {
    const keyframes = [
        { transform: "translateY(0)" },
        { transform: "translateY(-10px)" },
        { transform: "translateY(0)" },
    ];
    const animationOptions = { duration: 500, iterations: 2, easing: 'ease-in-out' };
    let cartButton = document.querySelector('nav .cart-button');
    if (cartButton) cartButton.animate(keyframes, animationOptions);
}

// ==================== CLEAR ALL ITEMS ====================
function clearAllItems(userCart) {
    userCart.innerHTML = '';
    updateTotalPrice(0, "clearAllItems");
    emptyCartMessage();
}

// ==================== PAYSTACK PAYMENT ====================
function payWithPaystack(e) {
    e.preventDefault();

    const firstName      = document.getElementById("first-name").value.trim();
    const lastName       = document.getElementById("last-name").value.trim();
    const email          = document.getElementById("email-address").value.trim();
    const phone          = document.getElementById("phone-number").value.trim();
    const deliveryAddress= document.getElementById("delivery-address").value.trim();

    const totalText = document.getElementById("order-total-display").textContent;
    const amount    = Number(totalText.substring(3));

    if (isNaN(amount) || amount <= 0) {
        alert('Invalid payment amount. Please check your cart.');
        return;
    }

    const metadata = {
        custom_fields: [
            { display_name: "First Name",       variable_name: "first_name",       value: firstName },
            { display_name: "Last Name",        variable_name: "last_name",        value: lastName },
            { display_name: "Phone Number",     variable_name: "phone",            value: phone },
            { display_name: "Delivery Address", variable_name: "delivery_address", value: deliveryAddress }
        ]
    };

    let handler = PaystackPop.setup({
        key: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx', // ← REPLACE WITH YOUR PAYSTACK PUBLIC KEY
        email: email,
        amount: Math.round(amount * 100),
        currency: 'KES',
        ref: 'MSS_' + Date.now() + '_' + Math.floor(Math.random() * 1000000),
        firstname: firstName,
        lastname: lastName,
        phone: phone,
        metadata: metadata,
        label: "MySolarShop Customer",

        callback: function(response) {
            alert('Payment successful! Reference: ' + response.reference + '\n\nThank you, ' + firstName + '! We will deliver to: ' + deliveryAddress);
            let userCart = document.querySelector('#cart-items-container ul');
            clearAllItems(userCart);
            closeCustomerForm();
        },
        onClose: function() {
            alert('Payment window closed. You can try again when ready.');
        }
    });

    handler.openIframe();
}