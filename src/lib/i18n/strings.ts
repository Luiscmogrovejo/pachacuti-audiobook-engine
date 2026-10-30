// src/lib/i18n/strings.ts -- Bilingual UI strings for Pachacuti
// Spanish (es) is the primary language. English (en) is the secondary.
// Quechua cultural terms are preserved in both languages (e.g., "Rikcharispa, pachacuti").

/** All translatable UI string keys */
export interface UIStrings {
  // Hero section
  'hero.epigraph': string
  'hero.subtitle': string
  'hero.tagline': string
  'hero.cta.start': string
  'hero.cta.continue': string
  'hero.chapters': string

  // Section headings
  'section.characters': string
  'section.characters.cta': string
  'section.journey': string
  'section.world': string

  // Auth -- signup gate
  'auth.signup.title': string
  'auth.signup.free': string
  'auth.signup.unlock': string
  'auth.signup.unlocks': string
  'auth.signup.success.detail': string
  'auth.signin.cta': string
  'auth.signin.check': string
  'auth.signin.existing': string
  'auth.signin.link': string
  'auth.signin.sending': string

  // Auth -- tier labels
  'auth.tiers.free': string
  'auth.tiers.signup': string
  'auth.tiers.paid': string

  // Auth -- paid gate
  'auth.paid.label': string
  'auth.paid.message': string
  'auth.paid.cta.buy': string
  'auth.paid.listen.available': string
  'auth.paid.includes': string
  'auth.paid.includes.chapters': string
  'auth.paid.includes.journey': string
  'auth.paid.includes.bilingual': string
  'auth.paid.includes.sync': string
  'auth.paid.signup.cta': string
  'auth.paid.signup.prompt': string
  'auth.paid.return': string

  // Payment page
  'page.payment.title': string
  'page.payment.subtitle': string
  'payment.product.name': string
  'payment.product.description': string
  'payment.includes.chapters': string
  'payment.includes.gallery': string
  'payment.includes.characters': string
  'payment.includes.sync': string
  'payment.cta.purchase': string
  'payment.cta.signin_first': string
  'payment.already_paid': string
  'payment.success.title': string
  'payment.success.message': string
  'payment.success.cta': string
  'payment.processing': string
  'payment.error': string

  // Footer
  'footer.copyright': string

  // Content protection
  'protection.title': string
  'protection.message': string
  'protection.copyright': string

  // Continue Listening
  'continue.into': string

  // Footer CTA
  'footer.cta.heading': string
  'footer.cta.subtitle': string
  'footer.cta.closing': string

  // Navigation
  'nav.listen': string
  'nav.characters': string
  'nav.glossary': string
  'nav.quiz': string
  'nav.map': string
  'nav.close': string

  // Page headings -- Characters
  'page.characters.title': string
  'page.characters.subtitle': string
  'page.characters.trio': string
  'page.characters.all': string
  'page.characters.back': string
  'page.characters.detail.back': string
  'page.characters.detail.faction': string
  'page.characters.detail.firstAppearance': string
  'page.characters.detail.etymology': string
  'page.characters.detail.whoIs': string
  'page.characters.detail.personality': string
  'page.characters.detail.arc': string

  // Page headings -- Glossary
  'page.glossary.title': string
  'page.glossary.subtitle': string
  'page.glossary.count': string
  'page.glossary.description': string

  // Page headings -- Quiz
  'page.quiz.title': string
  'page.quiz.subtitle': string
  'page.quiz.count': string
  'page.quiz.detail': string
  'page.quiz.back': string
  'page.quiz.study': string

  // Page headings -- Map
  'page.map.subtitle': string
  'page.map.description': string
  'page.map.fourSuyus': string
  'page.map.journey': string
  'page.map.chinchaysuyu': string
  'page.map.chinchaysuyu.desc': string
  'page.map.antisuyu': string
  'page.map.antisuyu.desc': string
  'page.map.qollasuyu': string
  'page.map.qollasuyu.desc': string
  'page.map.kuntisuyu': string
  'page.map.kuntisuyu.desc': string

  // Page headings -- Gallery
  'page.gallery.title': string
  'page.gallery.subtitle': string
  'page.gallery.copyright': string
  'page.gallery.chapter': string

  // Page headings -- Settings
  'page.settings.title': string
  'page.settings.subtitle': string
  'page.settings.language': string
  'page.settings.playback': string
  'page.settings.audio': string
  'page.settings.accessibility': string
  'page.settings.privacy': string
  'page.settings.clearHistory': string
  'page.settings.clearBookmarks': string
  'page.settings.fontSize': string
  'page.settings.reducedMotion': string
  'page.settings.contrast': string
  'page.settings.saved': string

  // Navigation
  'nav.gallery': string
  'nav.settings': string
  'nav.signin': string

  // Language toggle
  'lang.switch': string

  // Page headings -- Sign In
  'page.signin.back': string

  // Quiz component strings
  'quiz.categories': string
  'quiz.difficulty': string
  'quiz.all': string
  'quiz.questions': string
  'quiz.available': string
  'quiz.start': string
  'quiz.questionOf': string
  'quiz.correct': string
  'quiz.check': string
  'quiz.next': string
  'quiz.seeResults': string
  'quiz.tryAgain': string
  'quiz.reviewAnswers': string
  'quiz.hideReview': string
  'quiz.correctAnswer': string
  'quiz.yourAnswer': string
  'quiz.easy': string
  'quiz.medium': string
  'quiz.hard': string

  // Glossary component strings
  'glossary.all': string
  'glossary.search': string
  'glossary.showing': string
  'glossary.noResults': string
  'glossary.clearFilters': string
  'glossary.firstAppears': string
  'glossary.persona': string
  'glossary.lugar': string
  'glossary.objeto': string
  'glossary.concepto': string
  'glossary.expresion': string

  // Map component strings
  'map.journey': string
  'map.visited': string
  'map.undiscovered': string
  'map.discovered': string
  'map.undiscoveredLocation': string
  'map.prologue': string
  'map.chapter': string

  // Footer
  'footer.rights': string
}

/** All UI strings in both languages */
export const STRINGS: Record<'es' | 'en', UIStrings> = {
  es: {
    // Hero section
    'hero.epigraph': 'Rikcharispa, pachacuti',
    'hero.subtitle': 'El Que Estremece la Tierra',
    'hero.tagline': 'Un viaje auditivo inmersivo por el Peru de 1438',
    'hero.cta.start': 'Comenzar a Escuchar',
    'hero.cta.continue': 'Continuar Escuchando',
    'hero.chapters': '{n} capitulos en Espanol e Ingles',

    // Section headings
    'section.characters': 'Los Personajes',
    'section.characters.cta': 'Conoce a los {n} personajes',
    'section.journey': 'El Viaje',
    'section.world': 'El Mundo de Pachacuti',

    // Auth -- signup gate
    'auth.signup.title': 'Registrate para seguir escuchando',
    'auth.signup.free': 'Capitulos gratuitos (Prologo, Cap. 1-4) siempre disponibles.',
    'auth.signup.unlock': 'Registrate con tu email para desbloquear capitulos 5-10.',
    'auth.signup.unlocks': 'Desbloquea capitulos 5-10 (6 capitulos)',
    'auth.signup.success.detail': 'Una vez verificado, tendras acceso a 6 capitulos mas (5-10)',
    'auth.signin.cta': 'Enviar Enlace Magico',
    'auth.signin.check': 'Revisa tu email',
    'auth.signin.existing': 'Ya tienes una cuenta?',
    'auth.signin.link': 'Inicia sesion',
    'auth.signin.sending': 'Enviando...',

    // Auth -- tier labels
    'auth.tiers.free': 'Gratis',
    'auth.tiers.signup': 'Registrado',
    'auth.tiers.paid': 'Premium',

    // Auth -- paid gate
    'auth.paid.label': 'Capitulo Premium',
    'auth.paid.message': 'Este capitulo es parte de la coleccion premium',
    'auth.paid.cta.buy': 'Desbloquear Premium',
    'auth.paid.listen.available': 'Escucha los capitulos disponibles',
    'auth.paid.includes': 'Premium incluye',
    'auth.paid.includes.chapters': '13 capitulos adicionales que cubren la saga completa de Pachacuti',
    'auth.paid.includes.journey': 'Desde las profundidades de la selva hasta la batalla final en Yahuar Pampa',
    'auth.paid.includes.bilingual': 'Narracion en Espanol e Ingles',
    'auth.paid.includes.sync': 'Sincronizacion entre dispositivos y marcadores ilimitados',
    'auth.paid.signup.cta': 'Registrate para comprar',
    'auth.paid.signup.prompt': 'Registrate primero para poder comprar acceso premium',
    'auth.paid.return': 'Volver a capitulos gratuitos',

    // Payment page
    'page.payment.title': 'Pachacuti Premium',
    'page.payment.subtitle': 'La saga completa de Pachacuti',
    'payment.product.name': 'Pachacuti Premium -- Saga Completa',
    'payment.product.description': 'Desbloquea los 13 capitulos finales, galeria completa y los 32 retratos de personajes',
    'payment.includes.chapters': '13 capitulos adicionales (Cap. 11-23)',
    'payment.includes.gallery': 'Galeria completa de arte con todas las escenas',
    'payment.includes.characters': 'Los 32 retratos de personajes desbloqueados',
    'payment.includes.sync': 'Sincronizacion entre dispositivos',
    'payment.cta.purchase': 'Comprar Acceso Premium',
    'payment.cta.signin_first': 'Inicia sesion para comprar',
    'payment.already_paid': 'Ya tienes acceso premium',
    'payment.success.title': 'Bienvenido a Pachacuti Premium',
    'payment.success.message': 'Tu pago ha sido confirmado. Ahora tienes acceso a la saga completa.',
    'payment.success.cta': 'Escuchar Capitulo 11',
    'payment.processing': 'Procesando tu pago...',
    'payment.error': 'Algo salio mal. Intenta de nuevo.',

    // Footer
    'footer.copyright': 'Todos los derechos reservados.',

    // Content protection
    'protection.title': 'Contenido Protegido',
    'protection.message': 'Herramientas de desarrollo detectadas. Cierre la consola para continuar.',
    'protection.copyright': 'Pachacuti — Todos los derechos reservados',

    // Continue Listening
    'continue.into': 'en',

    // Footer CTA
    'footer.cta.heading': 'Comienza el Viaje',
    'footer.cta.subtitle': 'Desde las calles de Cusco hasta la batalla final en Yahuar Pampa',
    'footer.cta.closing': 'Allin kachkanchik — Estamos bien.',

    // Navigation
    'nav.listen': 'Escuchar',
    'nav.characters': 'Personajes',
    'nav.glossary': 'Glosario',
    'nav.quiz': 'Quiz',
    'nav.map': 'Mapa',
    'nav.close': 'Cerrar',

    // Page headings -- Characters
    'page.characters.title': 'Los Personajes de Pachacuti',
    'page.characters.subtitle': '32 personajes del mundo Inca',
    'page.characters.trio': 'El Trio Principal',
    'page.characters.all': 'Todos los Personajes',
    'page.characters.back': 'Inicio',
    'page.characters.detail.back': 'Todos los Personajes',
    'page.characters.detail.faction': 'Faccion',
    'page.characters.detail.firstAppearance': 'Primera Aparicion',
    'page.characters.detail.etymology': 'Etimologia Quechua',
    'page.characters.detail.whoIs': 'Quien Es',
    'page.characters.detail.personality': 'Personalidad',
    'page.characters.detail.arc': 'Arco Narrativo',

    // Page headings -- Glossary
    'page.glossary.title': 'Simi Taqe',
    'page.glossary.subtitle': 'Glosario Quechua',
    'page.glossary.count': '186 palabras del mundo de Pachacuti',
    'page.glossary.description': 'El quechua fue la lengua franca del Tawantinsuyu, hablada por millones a lo largo de los Andes. Estas palabras aparecen a lo largo de la historia de la transformacion de Cusi Yupanqui en Pachacuti. Escucha su pronunciacion, descubre su significado cultural y profundiza tu comprension del mundo Inca.',

    // Page headings -- Quiz
    'page.quiz.title': 'Yachay',
    'page.quiz.subtitle': 'Aprende',
    'page.quiz.count': 'Pon a prueba tu conocimiento del mundo Inca',
    'page.quiz.detail': '120 preguntas en 6 categorias y 3 niveles de dificultad',
    'page.quiz.back': 'Volver al Inicio',
    'page.quiz.study': 'Estudia el Glosario primero',

    // Page headings -- Map
    'page.map.subtitle': 'El Imperio de las Cuatro Regiones',
    'page.map.description': 'Sigue el viaje de Cusi a traves del imperio Inca. Las ubicaciones se revelan a medida que escuchas cada capitulo.',
    'page.map.fourSuyus': 'Los Cuatro Suyus',
    'page.map.journey': '~3,760 km de viaje',
    'page.map.chinchaysuyu': 'Chinchaysuyu',
    'page.map.chinchaysuyu.desc': 'El cuarto norte. Tierra de los Chimu, Moche y Chachapoya. Civilizaciones antiguas con piramides, oro y fortalezas en las nubes.',
    'page.map.antisuyu': 'Antisuyu',
    'page.map.antisuyu.desc': 'El cuarto de la selva oriental. Selva amazonica densa, hogar de pueblos que los Incas nunca pudieron conquistar del todo. Fuente de coca, plumas y pieles de jaguar.',
    'page.map.qollasuyu': 'Qollasuyu',
    'page.map.qollasuyu.desc': 'El cuarto sur. Altiplano elevado, lago Titicaca y las antiguas ruinas de Tiwanaku. Donde comienza el mito de origen Inca.',
    'page.map.kuntisuyu': 'Kuntisuyu',
    'page.map.kuntisuyu.desc': 'El cuarto occidental. Desiertos costeros del Pacifico, pueblos pesqueros y los textiles Paracas que tejen historias mas antiguas que la escritura.',

    // Page headings -- Gallery
    'page.gallery.title': 'Galeria de Arte',
    'page.gallery.subtitle': 'Escenas ilustradas de cada capitulo del viaje de Cusi',
    'page.gallery.copyright': 'Todas las ilustraciones son propiedad de Luis Mogrovejo.',
    'page.gallery.chapter': 'Capitulo',

    // Page headings -- Settings
    'page.settings.title': 'Ajustes',
    'page.settings.subtitle': 'Configura tu experiencia',
    'page.settings.language': 'Idioma',
    'page.settings.playback': 'Reproduccion',
    'page.settings.audio': 'Audio',
    'page.settings.accessibility': 'Accesibilidad',
    'page.settings.privacy': 'Privacidad',
    'page.settings.clearHistory': 'Borrar historial de escucha',
    'page.settings.clearBookmarks': 'Borrar marcadores',
    'page.settings.fontSize': 'Tamano de texto',
    'page.settings.reducedMotion': 'Movimiento reducido',
    'page.settings.contrast': 'Contraste alto',
    'page.settings.saved': 'Guardado',

    // Navigation
    'nav.gallery': 'Galeria',
    'nav.settings': 'Ajustes',
    'nav.signin': 'Iniciar Sesion',

    // Language toggle
    'lang.switch': 'Cambiar a Ingles',

    // Page headings -- Sign In
    'page.signin.back': 'Volver al inicio',

    // Quiz component strings
    'quiz.categories': 'Categorias',
    'quiz.difficulty': 'Dificultad',
    'quiz.all': 'Todas',
    'quiz.questions': 'Preguntas',
    'quiz.available': '{n} preguntas disponibles',
    'quiz.start': 'Iniciar Quiz',
    'quiz.questionOf': 'Pregunta {current} de {total}',
    'quiz.correct': '{n} correctas',
    'quiz.check': 'Verificar Respuesta',
    'quiz.next': 'Siguiente Pregunta',
    'quiz.seeResults': 'Ver Resultados',
    'quiz.tryAgain': 'Intentar de Nuevo',
    'quiz.reviewAnswers': 'Revisar Respuestas',
    'quiz.hideReview': 'Ocultar Revision',
    'quiz.correctAnswer': 'Correcta:',
    'quiz.yourAnswer': 'Tu respuesta:',
    'quiz.easy': 'Facil',
    'quiz.medium': 'Medio',
    'quiz.hard': 'Dificil',

    // Glossary component strings
    'glossary.all': 'Todas',
    'glossary.search': 'Buscar palabras en Quechua...',
    'glossary.showing': 'Mostrando {filtered} de {total} entradas',
    'glossary.noResults': 'No se encontraron palabras para',
    'glossary.clearFilters': 'Limpiar todos los filtros',
    'glossary.firstAppears': 'Primera aparicion: Capitulo {chapter}',
    'glossary.persona': 'Persona',
    'glossary.lugar': 'Lugar',
    'glossary.objeto': 'Objeto',
    'glossary.concepto': 'Concepto',
    'glossary.expresion': 'Expresion',

    // Map component strings
    'map.journey': '~3,760 km de viaje',
    'map.visited': 'Visitado',
    'map.undiscovered': 'Sin descubrir',
    'map.discovered': '{count} de {total} descubiertos',
    'map.undiscoveredLocation': 'Ubicacion sin descubrir',
    'map.prologue': 'Prologo',
    'map.chapter': 'Capitulo {n}',

    // Footer
    'footer.rights': 'Todos los derechos reservados.',
  },

  en: {
    // Hero section
    'hero.epigraph': 'Rikcharispa, pachacuti',
    'hero.subtitle': 'He Who Shakes the Earth',
    'hero.tagline': 'An immersive audiobook journey through 1438 Peru',
    'hero.cta.start': 'Start Listening',
    'hero.cta.continue': 'Continue Listening',
    'hero.chapters': '{n} chapters in Spanish & English',

    // Section headings
    'section.characters': 'The Characters',
    'section.characters.cta': 'Meet all {n} characters',
    'section.journey': 'The Journey',
    'section.world': 'The World of Pachacuti',

    // Auth -- signup gate
    'auth.signup.title': 'Sign up to continue listening',
    'auth.signup.free': 'Free chapters (Prologue, Ch. 1-4) are always available.',
    'auth.signup.unlock': 'Sign up with your email to unlock chapters 5-10.',
    'auth.signup.unlocks': 'Unlock chapters 5-10 (6 chapters)',
    'auth.signup.success.detail': 'Once verified, you\'ll have access to 6 more chapters (5-10)',
    'auth.signin.cta': 'Send Magic Link',
    'auth.signin.check': 'Check your email',
    'auth.signin.existing': 'Already have an account?',
    'auth.signin.link': 'Sign in',
    'auth.signin.sending': 'Sending...',

    // Auth -- tier labels
    'auth.tiers.free': 'Free',
    'auth.tiers.signup': 'Registered',
    'auth.tiers.paid': 'Premium',

    // Auth -- paid gate
    'auth.paid.label': 'Premium Chapter',
    'auth.paid.message': 'This chapter is part of the premium collection',
    'auth.paid.cta.buy': 'Unlock Premium',
    'auth.paid.listen.available': 'Listen to available chapters',
    'auth.paid.includes': 'Premium includes',
    'auth.paid.includes.chapters': '13 additional chapters covering the complete Pachacuti saga',
    'auth.paid.includes.journey': 'From the jungle depths to the final battle at Yahuar Pampa',
    'auth.paid.includes.bilingual': 'Both Spanish and English narration',
    'auth.paid.includes.sync': 'Cross-device sync and unlimited bookmarks',
    'auth.paid.signup.cta': 'Sign up to purchase',
    'auth.paid.signup.prompt': 'Sign up first to purchase premium access',
    'auth.paid.return': 'Return to free chapters',

    // Payment page
    'page.payment.title': 'Pachacuti Premium',
    'page.payment.subtitle': 'The Complete Pachacuti Saga',
    'payment.product.name': 'Pachacuti Premium -- Complete Saga',
    'payment.product.description': 'Unlock the final 13 chapters, full gallery, and all 32 character portraits',
    'payment.includes.chapters': '13 additional chapters (Ch. 11-23)',
    'payment.includes.gallery': 'Full art gallery with all scene illustrations',
    'payment.includes.characters': 'All 32 character portraits unlocked',
    'payment.includes.sync': 'Cross-device sync',
    'payment.cta.purchase': 'Purchase Premium Access',
    'payment.cta.signin_first': 'Sign in to purchase',
    'payment.already_paid': 'You already have premium access',
    'payment.success.title': 'Welcome to Pachacuti Premium',
    'payment.success.message': 'Your payment has been confirmed. You now have access to the complete saga.',
    'payment.success.cta': 'Listen to Chapter 11',
    'payment.processing': 'Processing your payment...',
    'payment.error': 'Something went wrong. Please try again.',

    // Footer
    'footer.copyright': 'All rights reserved.',

    // Content protection
    'protection.title': 'Protected Content',
    'protection.message': 'Developer tools detected. Close the console to continue.',
    'protection.copyright': 'Pachacuti — All rights reserved',

    // Continue Listening
    'continue.into': 'into',

    // Footer CTA
    'footer.cta.heading': 'Begin the Journey',
    'footer.cta.subtitle': 'From the streets of Cusco to the final battle at Yahuar Pampa',
    'footer.cta.closing': 'Allin kachkanchik — We are well.',

    // Navigation
    'nav.listen': 'Listen',
    'nav.characters': 'Characters',
    'nav.glossary': 'Glossary',
    'nav.quiz': 'Quiz',
    'nav.map': 'Map',
    'nav.close': 'Close',

    // Page headings -- Characters
    'page.characters.title': 'The Characters of Pachacuti',
    'page.characters.subtitle': '32 characters from the world of the Inca',
    'page.characters.trio': 'The Main Trio',
    'page.characters.all': 'All Characters',
    'page.characters.back': 'Home',
    'page.characters.detail.back': 'All Characters',
    'page.characters.detail.faction': 'Faction',
    'page.characters.detail.firstAppearance': 'First Appearance',
    'page.characters.detail.etymology': 'Quechua Etymology',
    'page.characters.detail.whoIs': 'Who They Are',
    'page.characters.detail.personality': 'Personality',
    'page.characters.detail.arc': 'Narrative Arc',

    // Page headings -- Glossary
    'page.glossary.title': 'Simi Taqe',
    'page.glossary.subtitle': 'Quechua Glossary',
    'page.glossary.count': '186 words from the world of Pachacuti',
    'page.glossary.description': 'The Quechua language was the lingua franca of the Tawantinsuyu, spoken by millions across the Andes. These words appear throughout the story of Cusi Yupanqui\'s transformation into Pachacuti. Listen to their pronunciation, discover their cultural significance, and deepen your understanding of the Inca world.',

    // Page headings -- Quiz
    'page.quiz.title': 'Yachay',
    'page.quiz.subtitle': 'Learn',
    'page.quiz.count': 'Test your knowledge of the Inca world',
    'page.quiz.detail': '120 questions across 6 categories and 3 difficulty levels',
    'page.quiz.back': 'Back to Home',
    'page.quiz.study': 'Study the Glossary first',

    // Page headings -- Map
    'page.map.subtitle': 'The Empire of the Four Regions',
    'page.map.description': 'Follow Cusi\'s journey across the Inca Empire. Locations reveal as you listen to each chapter.',
    'page.map.fourSuyus': 'The Four Suyus',
    'page.map.journey': '~3,760 km journey',
    'page.map.chinchaysuyu': 'Chinchaysuyu',
    'page.map.chinchaysuyu.desc': 'The northern quarter. Land of the Chimu, Moche, and Chachapoya. Ancient civilizations with pyramids, gold, and fortresses in the clouds.',
    'page.map.antisuyu': 'Antisuyu',
    'page.map.antisuyu.desc': 'The eastern jungle quarter. Dense Amazon rainforest, home to peoples the Inca could never fully conquer. Source of coca, feathers, and jaguar pelts.',
    'page.map.qollasuyu': 'Qollasuyu',
    'page.map.qollasuyu.desc': 'The southern quarter. High altiplano, Lake Titicaca, and the ancient ruins of Tiwanaku. Where the Inca origin myth begins.',
    'page.map.kuntisuyu': 'Kuntisuyu',
    'page.map.kuntisuyu.desc': 'The western quarter. Pacific coast deserts, fishing villages, and the Paracas textiles that weave stories older than writing.',

    // Page headings -- Gallery
    'page.gallery.title': 'Art Gallery',
    'page.gallery.subtitle': 'Illustrated scenes from each chapter of Cusi\'s journey',
    'page.gallery.copyright': 'All illustrations are the property of Luis Mogrovejo.',
    'page.gallery.chapter': 'Chapter',

    // Page headings -- Settings
    'page.settings.title': 'Settings',
    'page.settings.subtitle': 'Configure your experience',
    'page.settings.language': 'Language',
    'page.settings.playback': 'Playback',
    'page.settings.audio': 'Audio',
    'page.settings.accessibility': 'Accessibility',
    'page.settings.privacy': 'Privacy',
    'page.settings.clearHistory': 'Clear listening history',
    'page.settings.clearBookmarks': 'Clear bookmarks',
    'page.settings.fontSize': 'Font size',
    'page.settings.reducedMotion': 'Reduced motion',
    'page.settings.contrast': 'High contrast',
    'page.settings.saved': 'Saved',

    // Navigation
    'nav.gallery': 'Gallery',
    'nav.settings': 'Settings',
    'nav.signin': 'Sign In',

    // Language toggle
    'lang.switch': 'Switch to Spanish',

    // Page headings -- Sign In
    'page.signin.back': 'Back to home',

    // Quiz component strings
    'quiz.categories': 'Categories',
    'quiz.difficulty': 'Difficulty',
    'quiz.all': 'All',
    'quiz.questions': 'Questions',
    'quiz.available': '{n} questions available',
    'quiz.start': 'Start Quiz',
    'quiz.questionOf': 'Question {current} of {total}',
    'quiz.correct': '{n} correct',
    'quiz.check': 'Check Answer',
    'quiz.next': 'Next Question',
    'quiz.seeResults': 'See Results',
    'quiz.tryAgain': 'Try Again',
    'quiz.reviewAnswers': 'Review Answers',
    'quiz.hideReview': 'Hide Review',
    'quiz.correctAnswer': 'Correct:',
    'quiz.yourAnswer': 'Your answer:',
    'quiz.easy': 'Easy',
    'quiz.medium': 'Medium',
    'quiz.hard': 'Hard',

    // Glossary component strings
    'glossary.all': 'All',
    'glossary.search': 'Search Quechua words...',
    'glossary.showing': 'Showing {filtered} of {total} entries',
    'glossary.noResults': 'No words found for',
    'glossary.clearFilters': 'Clear all filters',
    'glossary.firstAppears': 'First appears: Chapter {chapter}',
    'glossary.persona': 'Person',
    'glossary.lugar': 'Place',
    'glossary.objeto': 'Object',
    'glossary.concepto': 'Concept',
    'glossary.expresion': 'Expression',

    // Map component strings
    'map.journey': '~3,760 km journey',
    'map.visited': 'Visited',
    'map.undiscovered': 'Undiscovered',
    'map.discovered': '{count} of {total} discovered',
    'map.undiscoveredLocation': 'Undiscovered location',
    'map.prologue': 'Prologue',
    'map.chapter': 'Chapter {n}',

    // Footer
    'footer.rights': 'All rights reserved.',
  },
}

/**
 * Translate a UI string key for a given language.
 * Supports simple {placeholder} interpolation via optional params.
 *
 * @example
 * t('hero.chapters', 'es', { n: '24' }) // "24 capitulos en Espanol e Ingles"
 * t('auth.signup.title', 'en')           // "Sign up to continue listening"
 */
export function t(
  key: keyof UIStrings,
  lang: 'es' | 'en',
  params?: Record<string, string | number>,
): string {
  let value = STRINGS[lang][key] ?? STRINGS.es[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v))
    }
  }
  return value
}
