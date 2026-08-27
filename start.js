/* =========================================================
   LOGO VIDEO -> CANVAS
========================================================= */

const logoVideo = document.getElementById('logo-video');
const logoCanvas = document.getElementById('logo-canvas');
const logoCtx = logoCanvas.getContext('2d', {
    willReadFrequently: true
});

function processLogoFrame() {

    if (!logoVideo) return;

    if (logoVideo.videoWidth && logoVideo.videoHeight) {

        if (
            logoCanvas.width !== logoVideo.videoWidth ||
            logoCanvas.height !== logoVideo.videoHeight
        ) {
            logoCanvas.width = logoVideo.videoWidth;
            logoCanvas.height = logoVideo.videoHeight;
        }

        logoCtx.drawImage(
            logoVideo,
            0,
            0,
            logoCanvas.width,
            logoCanvas.height
        );

        try {

            const frame = logoCtx.getImageData(
                0,
                0,
                logoCanvas.width,
                logoCanvas.height
            );

            const data = frame.data;

            for (let i = 0; i < data.length; i += 4) {

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const dist = Math.sqrt(
                    (r - 61) * (r - 61) +
                    (g - 255) * (g - 255) +
                    (b - 3) * (b - 3)
                );

                if (
                    dist < 165 ||
                    (
                        g > 100 &&
                        g > r * 1.25 &&
                        g > b * 1.25
                    )
                ) {
                    data[i + 3] = 0;
                }
            }

            logoCtx.putImageData(frame, 0, 0);

        } catch (e) {
            console.error("Errore lettura Canvas:", e);
        }
    }

    if (!logoVideo.ended && !logoVideo.paused) {
        requestAnimationFrame(processLogoFrame);
    }
}

if (logoVideo) {

    logoVideo.onloadedmetadata = () => {
        logoVideo.play().catch(() => {});
    };

    logoVideo.addEventListener('play', () => {
        requestAnimationFrame(processLogoFrame);
    });

    logoVideo.addEventListener('ended', () => {
        processLogoFrame();
    });

    logoVideo.play().catch(() => {});
}


/* =========================================================
   NPC VIDEO -> CANVAS
========================================================= */

const npcVideo = document.getElementById('giovannone-video');
const npcCanvas = document.getElementById('npc-canvas');
const npcCtx = npcCanvas.getContext('2d', {
    willReadFrequently: true
});

function processNpcFrame() {

    if (
        npcVideo &&
        !npcVideo.paused &&
        !npcVideo.ended
    ) {

        if (npcVideo.videoWidth && npcVideo.videoHeight) {

            if (
                npcCanvas.width !== npcVideo.videoWidth ||
                npcCanvas.height !== npcVideo.videoHeight
            ) {
                npcCanvas.width = npcVideo.videoWidth;
                npcCanvas.height = npcVideo.videoHeight;
            }

            npcCtx.drawImage(
                npcVideo,
                0,
                0,
                npcCanvas.width,
                npcCanvas.height
            );

            try {

                const frame = npcCtx.getImageData(
                    0,
                    0,
                    npcCanvas.width,
                    npcCanvas.height
                );

                const data = frame.data;

                for (let i = 0; i < data.length; i += 4) {

                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    const dist = Math.hypot(
                        r - 61,
                        g - 255,
                        b - 3
                    );

                    if (
                        dist < 145 ||
                        (
                            g > 110 &&
                            g > r * 1.15 &&
                            g > b * 1.15
                        )
                    ) {
                        data[i + 3] = 0;
                    } else {

                        const maxRB = Math.max(r, b);

                        if (g > maxRB) {
                            data[i + 1] = maxRB;
                        }
                    }
                }

                npcCtx.putImageData(frame, 0, 0);

            } catch (e) {}
        }
    }

    requestAnimationFrame(processNpcFrame);
}

npcVideo.addEventListener('play', () => {
    requestAnimationFrame(processNpcFrame);
});


/* =========================================================
   AVATAR
========================================================= */

const AVATAR_LIST = Array.from(
    { length: 102 },
    (_, i) => `assets/avatars/testa${i + 1}.png`
);


/* =========================================================
   DIALOGHI
========================================================= */

const DIALOGUE_STEPS = [

    {
        text: "Ehi, ciao! Sono Giovannone. Non so se ci conosciamo...",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "...",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "a dire il vero, non so neanche io perché sono qui. Ma a questo punto, ti faccio qualche domanda.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "...",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Sbrighiamo queste pratiche e sei dei nostri.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Come ti chiami.",
        type: "username",
        placeholder: "NOME UTENTE",
        promptBtn: "INSERISCI NOME ►",
        btn: "CONFERMA NOME ►"
    },

    {
        text: "Ottimo. Esisti.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "...",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Ora scegli una situazione che ti rappresenta.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Non chiedermi perché. È burocrazia creativa.",
        type: "choice_activity",
        infoText: "qualcosa che ti rappresenta",
        promptBtn: "SCEGLI ATTIVITÀ ►",
        options: [
            "Controllo il frigorifero anche se so già cosa c'è dentro",
            "Entro in una stanza e dimentico perché ci sono entrato",
            "Cerco il telefono mentre lo tengo in mano",
            "Rimando la sveglia per la quinta volta",
            "Controllo di nuovo se ho chiuso la porta",
            "Mi siedo un attimo e sparisco per mezz'ora",
            "Entro al supermercato per una cosa e ne esco con dodici",
            "Guardo il telefono senza avere nessuna notifica",
            "Mi preparo un caffè e dimentico di berlo",
            "Esco e torno indietro perché ho dimenticato qualcosa",
            "Provo a fare qualcosa senza leggere le istruzioni",
            "Leggo le istruzioni dopo aver fatto un casino",
            "Mi chiedo cosa mangiare mentre sto già mangiando",
            "Decido di cambiare vita a partire da lunedì",
            "Guardo il soffitto e rivaluto tutte le mie scelte",
            "Mi viene un'idea geniale mentre sto facendo tutt'altro",
            "Controllo l'ora sul telefono e dimentico immediatamente che ore sono",
            "Faccio una foto alle cose che probabilmente non riguarderò mai",
            "Pianifico la conquista del mondo tra due meeting",
            "Sguardo fisso al monitor per sembrare immerso nei pensieri"
        ],
        btn: "CONFERMA SCELTA ►"
    },

    {
        text: "Ah, interessante.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Ora dimmi chi sei per noi:",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "insomma, qualcosa che ci permetta di inquadrarti.",
        type: "choice_role",
        infoText: "chi sei tu veramente?",
        promptBtn: "SCEGLI RUOLO ►",
        options: [
            "Un collega",
            "Un amico",
            "Un cliente",
            "Un conoscente",
            "Uno che è entrato seguendo qualcuno e adesso non sa più come uscire",
            "Un amico di un amico",
            "Un collega di un collega",
            "Uno che “conosce uno che lavora qui”",
            "Un corriere",
            "Un infiltrato",
            "Un investigatore privato",
            "Un alieno sotto copertura",
            "Un'intelligenza artificiale che ha preso un corpo umano"
        ],
        btn: "CONFERMA SCELTA ►"
    },

    {
        text: "Perfetto. Manca solo una faccia.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Scegli un avatar.",
        type: "avatar",
        infoText: "che faccia hai?",
        promptBtn: "SCEGLI AVATAR ►",
        btn: "SCEGLI QUESTA TESTA ►"
    },

    {
        text: "Bene. Tanto nel gioco la tua faccia non serve.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Per quello abbiamo già tutta la gente dello studio.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Questa registrazione serve solo a sapere chi incolpare quando salta tutto.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Pura amministrazione.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "...",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Ultima cosa: password.",
        type: "password",
        placeholder: "PASSWORD",
        promptBtn: "INSERISCI PASSWORD ►",
        btn: "SALVA PASSWORD ►"
    },

    {
        text: "Perfetto. Io torno a fare...qualcosa.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Non so bene cosa, ma sicuramente è importante.",
        type: "none",
        btn: "AVANTI ►"
    },

    {
        text: "Ci vediamo dentro.",
        type: "finish",
        btn: "ENTRA NELLO STUDIO ►"
    }

];


/* =========================================================
   UTENTE SALVATO
========================================================= */

function getSavedUser() {

    try {

        const u = localStorage.getItem('arcade_current_user');

        return u ? JSON.parse(u) : null;

    } catch (e) {
        return null;
    }
}


/* =========================================================
   ELEMENTI DOM
========================================================= */

const landingScreen =
    document.getElementById('landing-screen');

const onboardingScreen =
    document.getElementById('onboarding-screen');

const loginModal =
    document.getElementById('login-modal');

const actionButtonsContainer =
    document.getElementById('action-buttons-container');

const centerStageBox =
    document.getElementById('center-stage-box');

const npcStageBox =
    document.getElementById('npc-stage-box');

const homeMenuBtn =
    document.getElementById('home-menu-btn');

const fullCoverBox =
    document.getElementById('full-cover-box');

const listInfoTitle =
    document.getElementById('list-info-title');

const dialogueText =
    document.getElementById('dialogue-text');

const inputField =
    document.getElementById('arcade-input-field');

const choiceGrid =
    document.getElementById('choice-grid');

const avatarGrid =
    document.getElementById('avatar-grid');

const stepBtn =
    document.getElementById('step-btn');


/* =========================================================
   LANDING
========================================================= */

function renderLandingButtons() {

    const currentUser = getSavedUser();

    const isLoggedIn =
        currentUser &&
        currentUser.username &&
        !currentUser.username.startsWith("GUEST_");

    actionButtonsContainer.innerHTML = "";

    homeMenuBtn.style.display = "none";

    if (isLoggedIn) {

        const btnContinue =
            document.createElement('button');

        btnContinue.className = "arcade-main-btn";
        btnContinue.innerText = "CONTINUA ►";

        btnContinue.onclick = () => {

            localStorage.setItem(
                'arcade_player_x',
                '200'
            );

            window.location.replace("index.html");
        };

        const btnLogout =
            document.createElement('button');

        btnLogout.className =
            "arcade-secondary-btn";

        btnLogout.innerText = "ESCI";

        btnLogout.onclick = () => {

            localStorage.removeItem(
                'arcade_current_user'
            );

            renderLandingButtons();
        };

        actionButtonsContainer.appendChild(btnContinue);
        actionButtonsContainer.appendChild(btnLogout);

    } else {

        const btnStart =
            document.createElement('button');

        btnStart.className = "arcade-main-btn";
        btnStart.innerText = "INIZIA";

        btnStart.onclick = () => {
            startOnboarding();
        };

        const btnLogin =
            document.createElement('button');

        btnLogin.className =
            "arcade-secondary-btn";

        btnLogin.innerText = "ACCEDI / LOGIN";

        btnLogin.onclick = () => {
            loginModal.style.display = "flex";
        };

        actionButtonsContainer.appendChild(btnStart);
        actionButtonsContainer.appendChild(btnLogin);
    }
}

renderLandingButtons();


/* =========================================================
   HOME
========================================================= */

homeMenuBtn.onclick = () => {

    onboardingScreen.style.display = "none";
    landingScreen.style.display = "flex";
    homeMenuBtn.style.display = "none";

    currentStepIdx = 0;
    stepPhase = "dialogue";

    if (autoAdvanceTimeout) {
        clearTimeout(autoAdvanceTimeout);
        autoAdvanceTimeout = null;
    }

    isTyping = false;

    renderLandingButtons();
};


/* =========================================================
   LOGIN
========================================================= */

document.getElementById(
    'login-cancel-btn'
).onclick = () => {

    loginModal.style.display = "none";

    document.getElementById(
        'login-username-input'
    ).value = "";

    document.getElementById(
        'login-password-input'
    ).value = "";
};


document.getElementById(
    'login-submit-btn'
).onclick = async () => {

    const uVal =
        document.getElementById(
            'login-username-input'
        ).value.trim();

    const pVal =
        document.getElementById(
            'login-password-input'
        ).value.trim();

    if (!uVal || !pVal) {
        alert("Inserisci Nome Utente e Password!");
        return;
    }

    const btn =
        document.getElementById(
            'login-submit-btn'
        );

    btn.disabled = true;
    btn.innerText = "ACCESSO...";

    let loggedUser = null;

    if (supabaseClient) {

        try {

            const {
                data,
                error
            } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('username', uVal)
                .eq('password', pVal)
                .maybeSingle();

            if (!error && data) {

                const defaultStats = {
                    gamesPlayed: 0,
                    feedbackInvaders: 0,
                    cyberRun: 0,
                    pixelPunch: 0,
                    deadlineDrive: 0
                };

                loggedUser = {
                    username: data.username,
                    avatar:
                        data.avatar ||
                        "assets/avatars/testa1.png",
                    activity: data.activity || "",
                    role: data.role || "",
                    stats:
                        data.stats ||
                        defaultStats
                };
            }

        } catch (e) {

            console.error(
                "Errore login Supabase:",
                e
            );
        }
    }

    if (loggedUser) {

        localStorage.setItem(
            'arcade_current_user',
            JSON.stringify(loggedUser)
        );

        localStorage.setItem(
            'arcade_player_x',
            '200'
        );

        window.location.replace("index.html");

    } else {

        alert(
            "Credenziali errate o utente non trovato su Supabase!"
        );

        btn.disabled = false;
        btn.innerText = "ACCEDI";
    }
};


/* =========================================================
   ONBOARDING
========================================================= */

let currentStepIdx = 0;
let stepPhase = 'dialogue';

let tempUsername = "";
let tempPassword = "";
let tempAvatar = AVATAR_LIST[0];
let tempActivity = "";
let tempRole = "";

let isTyping = false;
let currentTypeSpeed = 10;
let autoAdvanceTimeout = null;


/* TAP SU AREA VUOTA = FAST FORWARD */

onboardingScreen.addEventListener(
    'pointerdown',
    (e) => {

        if (
            e.target.closest(
                'button, input, .choice-btn, .avatar-option, .choice-grid, .avatar-grid'
            )
        ) {
            return;
        }

        if (isTyping) {
            currentTypeSpeed = 2;
        }
    }
);


function startOnboarding() {

    landingScreen.style.display = "none";
    loginModal.style.display = "none";

    onboardingScreen.style.display = "flex";
    homeMenuBtn.style.display = "flex";

    currentStepIdx = 0;
    stepPhase = "dialogue";

    tempUsername = "";
    tempPassword = "";
    tempAvatar = AVATAR_LIST[0];
    tempActivity = "";
    tempRole = "";

    if (npcVideo.paused) {
        npcVideo.play().catch(() => {});
    }

    renderStep();
}


/* =========================================================
   RENDER STEP
========================================================= */

function renderStep() {

    if (autoAdvanceTimeout) {

        clearTimeout(autoAdvanceTimeout);
        autoAdvanceTimeout = null;
    }

    stepPhase = 'dialogue';

    const stepData =
        DIALOGUE_STEPS[currentStepIdx];

    inputField.style.display = "none";

    fullCoverBox.style.display = "none";
    choiceGrid.style.display = "none";
    avatarGrid.style.display = "none";

    inputField.value = "";

    centerStageBox.style.display = "flex";
    npcStageBox.style.display = "flex";

    const inputTypes = [
        "username",
        "password",
        "choice_activity",
        "choice_role",
        "avatar"
    ];

    if (inputTypes.includes(stepData.type)) {

        stepBtn.innerText =
            stepData.promptBtn ||
            "CONTINUA ►";

    } else {

        stepBtn.innerText =
            stepData.btn ||
            "AVANTI ►";
    }

    const cleanText =
        stepData.text
            .trim()
            .replace(/\s/g, '');

    const isDotsOnly =
        /^\.+$/.test(cleanText);

    typeWriter(
        stepData.text,
        () => {

            if (
                isDotsOnly &&
                stepData.type === "none"
            ) {

                stepBtn.disabled = true;

                autoAdvanceTimeout =
                    setTimeout(() => {
                        advanceStep();
                    }, 500);
            }
        },
        isDotsOnly
    );
}


/* =========================================================
   CHOICE GRID
========================================================= */

function renderChoiceGrid(
    options,
    onSelectCallback
) {

    choiceGrid.innerHTML = "";

    let selectedVal = "";

    options.forEach((optText, index) => {

        const btn =
            document.createElement('button');

        btn.className = 'choice-btn';
        btn.innerText = optText;

        if (index === 0) {

            btn.classList.add('selected');

            selectedVal = optText;

            onSelectCallback(selectedVal);
        }

        btn.onclick = () => {

            choiceGrid
                .querySelectorAll('.choice-btn')
                .forEach(b =>
                    b.classList.remove('selected')
                );

            btn.classList.add('selected');

            selectedVal = optText;

            onSelectCallback(selectedVal);
        };

        choiceGrid.appendChild(btn);
    });

    requestAnimationFrame(() => {
        choiceGrid.scrollTop = 0;
    });

    setTimeout(() => {
        choiceGrid.scrollTop = 0;
    }, 10);
}


/* =========================================================
   AVATAR GRID
========================================================= */

function renderAvatarGrid() {

    avatarGrid.innerHTML = "";

    const fragment =
        document.createDocumentFragment();

    AVATAR_LIST.forEach((src) => {

        const img =
            document.createElement('img');

        img.src = src;
        img.loading = "lazy";

        img.className =
            `avatar-option ${
                src === tempAvatar
                    ? 'selected'
                    : ''
            }`;

        img.onerror = function () {
            this.style.display = 'none';
        };

        img.onclick = function () {

            tempAvatar = src;

            avatarGrid
                .querySelectorAll('.avatar-option')
                .forEach(el =>
                    el.classList.remove('selected')
                );

            this.classList.add('selected');
        };

        fragment.appendChild(img);
    });

    avatarGrid.appendChild(fragment);

    requestAnimationFrame(() => {
        avatarGrid.scrollTop = 0;
    });

    setTimeout(() => {
        avatarGrid.scrollTop = 0;
    }, 10);
}


/* =========================================================
   ADVANCE STEP
========================================================= */

async function advanceStep() {

    if (autoAdvanceTimeout) {

        clearTimeout(autoAdvanceTimeout);
        autoAdvanceTimeout = null;
    }

    if (isTyping) return;

    const stepData =
        DIALOGUE_STEPS[currentStepIdx];

    const inputTypes = [
        "username",
        "password",
        "choice_activity",
        "choice_role",
        "avatar"
    ];


    /* =====================================================
       FASE 1
    ===================================================== */

    if (
        stepPhase === 'dialogue' &&
        inputTypes.includes(stepData.type)
    ) {

        stepPhase = 'input';

        if (stepData.type === "username") {

            centerStageBox.appendChild(inputField);

            inputField.style.display = "block";
            inputField.className =
                "arcade-input arcade-input-bottom";

            inputField.type = "text";
            inputField.placeholder =
                stepData.placeholder;

            inputField.maxLength = 20;

            inputField.focus();

            stepBtn.innerText =
                stepData.btn ||
                "CONFERMA NOME ►";

        }

        else if (stepData.type === "password") {

            centerStageBox.appendChild(inputField);

            inputField.style.display = "block";
            inputField.className =
                "arcade-input arcade-input-bottom";

            inputField.type = "password";
            inputField.placeholder =
                stepData.placeholder;

            inputField.maxLength = 100;

            inputField.focus();

            stepBtn.innerText =
                stepData.btn ||
                "SALVA PASSWORD ►";

        }

        else if (stepData.type === "choice_activity") {

            fullCoverBox.style.display = "flex";

            listInfoTitle.innerText =
                stepData.infoText ||
                "qualcosa che ti rappresenta";

            renderChoiceGrid(
                stepData.options,
                (val) => {
                    tempActivity = val;
                }
            );

            choiceGrid.style.display = "flex";

            stepBtn.innerText =
                stepData.btn ||
                "CONFERMA SCELTA ►";
        }

        else if (stepData.type === "choice_role") {

            fullCoverBox.style.display = "flex";

            listInfoTitle.innerText =
                stepData.infoText ||
                "chi sei tu veramente?";

            renderChoiceGrid(
                stepData.options,
                (val) => {
                    tempRole = val;
                }
            );

            choiceGrid.style.display = "flex";

            stepBtn.innerText =
                stepData.btn ||
                "CONFERMA SCELTA ►";
        }

        else if (stepData.type === "avatar") {

            fullCoverBox.style.display = "flex";

            listInfoTitle.innerText =
                stepData.infoText ||
                "che faccia hai?";

            renderAvatarGrid();

            avatarGrid.style.display = "grid";

            stepBtn.innerText =
                stepData.btn ||
                "SCEGLI QUESTA TESTA ►";
        }

        return;
    }


    /* =====================================================
       FASE 2
    ===================================================== */

    if (stepData.type === "username") {

        const val =
            inputField.value.trim();

        if (!val) {
            alert("Inserisci un nome utente!");
            return;
        }

        stepBtn.disabled = true;
        stepBtn.innerText = "VERIFICA IN CORSO...";

        if (supabaseClient) {

            try {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from('profiles')
                    .select('username')
                    .eq('username', val)
                    .maybeSingle();

                if (error) {

                    console.error(
                        "Errore verifica username:",
                        error
                    );

                    alert(
                        "Errore di connessione a Supabase."
                    );

                    stepBtn.disabled = false;
                    stepBtn.innerText =
                        stepData.btn ||
                        "CONFERMA NOME ►";

                    return;
                }

                if (data) {

                    alert(
                        "Nome utente già esistente sul Cloud!"
                    );

                    stepBtn.disabled = false;
                    stepBtn.innerText =
                        stepData.btn ||
                        "CONFERMA NOME ►";

                    return;
                }

            } catch (e) {

                console.error(
                    "Errore verifica username Supabase:",
                    e
                );

                alert(
                    "Errore di connessione a Supabase."
                );

                stepBtn.disabled = false;
                stepBtn.innerText =
                    stepData.btn ||
                    "CONFERMA NOME ►";

                return;
            }

        } else {

            alert(
                "Connessione a Supabase non disponibile!"
            );

            stepBtn.disabled = false;
            stepBtn.innerText =
                stepData.btn ||
                "CONFERMA NOME ►";

            return;
        }

        tempUsername = val;
        stepBtn.disabled = false;
    }


    else if (stepData.type === "choice_activity") {

        if (!tempActivity) {

            alert("Seleziona un'opzione!");
            return;
        }
    }


    else if (stepData.type === "choice_role") {

        if (!tempRole) {

            alert("Seleziona chi sei!");
            return;
        }
    }


    else if (stepData.type === "avatar") {

        if (!tempAvatar) {

            alert("Seleziona un avatar!");
            return;
        }
    }


    else if (stepData.type === "password") {

        const pass = inputField.value;

        if (!pass || pass.trim().length === 0) {

            alert("Inserisci una password valida!");
            return;
        }

        tempPassword = pass;

        stepBtn.disabled = true;
        stepBtn.innerText = "SALVATAGGIO...";

        const defaultStats = {
            gamesPlayed: 0,
            feedbackInvaders: 0,
            cyberRun: 0,
            pixelPunch: 0,
            deadlineDrive: 0
        };

        if (supabaseClient) {

            try {

                const response = await fetch(
                    `${SUPABASE_URL}/functions/v1/register-account`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "apikey": SUPABASE_ANON_KEY
                        },
                        body: JSON.stringify({
                            username: tempUsername,
                            password: tempPassword,
                            avatar: tempAvatar,
                            activity: tempActivity,
                            role: tempRole
                        })
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success || !result.session) {

                    console.error(
                        "Errore registrazione Supabase:",
                        result.error || response.status
                    );

                    alert(
                        "Errore registrazione Supabase: " +
                        (result.error || "registrazione non completata")
                    );

                    stepBtn.disabled = false;
                    stepBtn.innerText =
                        stepData.btn ||
                        "SALVA PASSWORD ►";

                    return;
                }

                const { error: sessionError } =
                    await supabaseClient.auth.setSession({
                        access_token:
                            result.session.access_token,
                        refresh_token:
                            result.session.refresh_token
                    });

                if (sessionError) {
                    throw sessionError;
                }

            } catch (e) {

                console.error(
                    "Errore durante il salvataggio:",
                    e
                );

                alert(
                    "Errore durante il salvataggio su Supabase!"
                );

                stepBtn.disabled = false;
                stepBtn.innerText =
                    stepData.btn ||
                    "SALVA PASSWORD ►";

                return;
            }

        } else {

            alert(
                "Connessione a Supabase non disponibile!"
            );

            stepBtn.disabled = false;
            stepBtn.innerText =
                stepData.btn ||
                "SALVA PASSWORD ►";

            return;
        }

        const newUser = {

            username: tempUsername,
            avatar: tempAvatar,
            activity: tempActivity,
            role: tempRole,
            stats: defaultStats

        };

        localStorage.setItem(
            'arcade_current_user',
            JSON.stringify(newUser)
        );

        localStorage.setItem(
            'arcade_player_x',
            '200'
        );

        stepBtn.disabled = false;
    }


    else if (stepData.type === "finish") {

        localStorage.setItem(
            'arcade_player_x',
            '200'
        );

        window.location.replace("index.html");

        return;
    }


    currentStepIdx++;
    stepPhase = 'dialogue';

    if (
        currentStepIdx <
        DIALOGUE_STEPS.length
    ) {

        renderStep();

    } else {

        localStorage.setItem(
            'arcade_player_x',
            '200'
        );

        window.location.replace("index.html");
    }
}


stepBtn.onclick = advanceStep;


/* =========================================================
   TYPEWRITER
========================================================= */

function typeWriter(
    text,
    onComplete,
    isDotsOnly = false
) {

    isTyping = true;

    stepBtn.disabled = true;

    currentTypeSpeed = 10;

    dialogueText.textContent = "";

    let i = 0;

    function type() {

        if (i < text.length) {

            dialogueText.textContent +=
                text.charAt(i);

            i++;

            setTimeout(
                type,
                currentTypeSpeed
            );

        } else {

            if (onComplete) {
                onComplete();
            }

            if (!isDotsOnly) {

                setTimeout(() => {

                    isTyping = false;
                    stepBtn.disabled = false;

                }, 200);

            } else {

                isTyping = false;
            }
        }
    }

    type();
}