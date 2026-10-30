// src/lib/data/map-locations.ts -- Map location data for Tawantinsuyu interactive map
// Uses real geographic coordinates (lat/lon) projected onto SVG viewport
// Peru bounding box: lat [-18.35, -0.04], lon [-81.33, -68.65]

export interface MapLocation {
  id: string;
  name: string;
  nameQuechua: string;
  lat: number;
  lon: number;
  /** Legacy x/y kept for backward compat -- use geoToSvg() instead */
  x: number;
  y: number;
  region: string;
  chapters: number[];
  description: string;
  descriptionEn: string;
}

// Peru geographic bounding box
const PERU_BOUNDS = {
  minLat: -18.35,
  maxLat: -0.04,
  minLon: -81.33,
  maxLon: -68.65,
} as const;

/**
 * Convert geographic coordinates (lat/lon) to SVG viewport coordinates (0-100).
 * x = left-to-right (west to east = minLon to maxLon)
 * y = top-to-bottom (north to south = maxLat to minLat, inverted for SVG)
 */
export function geoToSvg(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - PERU_BOUNDS.minLon) / (PERU_BOUNDS.maxLon - PERU_BOUNDS.minLon)) * 100;
  const y = ((PERU_BOUNDS.maxLat - lat) / (PERU_BOUNDS.maxLat - PERU_BOUNDS.minLat)) * 100;
  return { x, y };
}

/**
 * Simplified Peru country outline SVG path.
 * Based on real geographic coordinates, projected to the 0-100 SVG viewport.
 * ~40 points tracing Peru's coastline and borders.
 */
export const PERU_OUTLINE_PATH = (() => {
  // Key geographic points around Peru's border (lat, lon pairs)
  const peruBorderPoints: [number, number][] = [
    [-0.04, -75.18],   // NE corner (Ecuador border, Amazon)
    [-1.00, -75.50],
    [-2.20, -76.60],
    [-3.40, -78.10],   // Ecuador border, western
    [-3.48, -80.25],   // Tumbes (NW coast)
    [-4.00, -81.15],   // Northern coast
    [-5.10, -81.10],   // Piura coast
    [-6.00, -81.10],   // Sechura
    [-6.77, -79.85],   // Lambayeque coast
    [-7.70, -79.43],   // Trujillo coast
    [-8.10, -79.05],   // Northern coastal indent
    [-9.08, -78.55],   // Chimbote
    [-10.05, -77.60],  // Huarmey
    [-10.68, -77.80],  // Lima region
    [-11.78, -77.15],  // Lima coast
    [-12.05, -77.05],  // Lima
    [-13.00, -76.25],  // South of Lima
    [-13.64, -76.15],  // Pisco/Ica
    [-14.35, -75.80],  // Nazca coast
    [-15.44, -75.10],  // Atico coast
    [-16.00, -74.00],  // Camana
    [-17.00, -72.00],  // Mollendo
    [-17.63, -71.34],  // Tacna coast
    [-17.58, -69.50],  // Tacna border (Chile/Bolivia)
    [-17.00, -69.10],  // Titicaca south
    [-16.00, -69.00],  // Bolivia border
    [-15.00, -69.30],  // Bolivia border
    [-14.50, -69.00],  // Bolivia border
    [-13.30, -68.70],  // SE border
    [-12.50, -68.65],  // Madre de Dios
    [-11.00, -68.80],  // Brazil border
    [-10.00, -69.50],  // Acre border
    [-9.00, -70.00],   // Brazil border
    [-8.00, -71.00],   // Ucayali
    [-7.00, -73.00],   // Brazil/Colombia border
    [-4.00, -73.50],   // Loreto
    [-2.00, -74.00],   // Amazon headwaters
    [-0.04, -75.18],   // Close loop
  ];

  const svgPoints = peruBorderPoints.map(([lat, lon]) => geoToSvg(lat, lon));
  const path = svgPoints.map((pt, i) =>
    i === 0 ? `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}` : `L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
  ).join(' ');
  return path + ' Z';
})();

/**
 * Map locations with real geographic coordinates.
 * Each location has lat/lon from actual geographic positions plus
 * computed x/y for SVG rendering.
 */
function makeLocation(
  id: string,
  name: string,
  nameQuechua: string,
  lat: number,
  lon: number,
  region: string,
  chapters: number[],
  description: string,
  descriptionEn: string,
): MapLocation {
  const { x, y } = geoToSvg(lat, lon);
  return { id, name, nameQuechua, lat, lon, x, y, region, chapters, description, descriptionEn };
}

export const MAP_LOCATIONS: readonly MapLocation[] = [
  makeLocation(
    'cusco', 'Cusco', 'Qosqo',
    -13.52, -71.97, 'cusco', [1, 3, 4, 23],
    'Capital del Tawantinsuyu, la Ciudad del Puma. Corazon del mundo Inca donde Cusi Yupanqui crece.',
    'Capital of the Tawantinsuyu, the City of the Puma. Heart of the Inca world where Cusi Yupanqui grows up.',
  ),
  makeLocation(
    'primordial', 'The Beginning', 'Nawpa Pacha',
    -13.51, -71.96, 'primordial', [0],
    'Antes del tiempo, antes del mundo que conocemos. La epoca primordial de la que surgen todas las historias.',
    'Before time, before the world as we know it. The primordial epoch from which all stories emerge.',
  ),
  makeLocation(
    'sacsayhuaman', 'Sacsayhuaman', 'Saqsaywaman',
    -13.51, -71.98, 'cave', [2],
    'La gran fortaleza sobre Cusco. Sus cuevas guardan secretos mas antiguos que los propios Incas.',
    'The great fortress above Cusco. Its caves hold secrets older than the Inca themselves.',
  ),
  makeLocation(
    'coast-road', 'Coast Road', 'Qhapaq Nan Costa',
    -14.10, -75.50, 'coast-road', [5],
    'El camino real que desciende de los Andes al Pacifico, a traves de paisajes cambiantes.',
    'The royal road descending from the Andes to the Pacific coast, through shifting landscapes.',
  ),
  makeLocation(
    'paracas', 'Paracas', 'Paracas',
    -13.84, -76.25, 'coast-paracas', [6],
    'Antigua cultura costera famosa por sus textiles. Sus hilos cuentan historias mas antiguas que la escritura.',
    'Ancient coastal culture famous for their textiles. Their threads tell stories older than writing.',
  ),
  makeLocation(
    'sipan', 'Sipan', 'Sipan',
    -6.80, -79.60, 'coast-sipan', [7],
    'La tumba del Senor de Sipan, un gobernante Moche enterrado con tesoros que rivalizan con el antiguo Egipto.',
    'The tomb of the Lord of Sipan, a Moche ruler buried with treasures rivaling ancient Egypt.',
  ),
  makeLocation(
    'heights', 'Mountain Heights', 'Hanaq Urqu',
    -12.50, -72.50, 'heights', [8],
    'Donde el aire se adelgaza e Inti duerme mas cerca de la tierra. Cumbres sagradas que tocan el cielo.',
    'Where the air thins and Inti sleeps closest to the earth. Sacred peaks that touch the sky.',
  ),
  makeLocation(
    'chavin', 'Chavin', 'Chawin',
    -9.59, -77.18, 'chavin', [9],
    'Complejo de templos de una civilizacion antigua. Los Hijos de la Piedra tallaron dioses en las caras de las montanas.',
    'Temple complex of an ancient civilization. The Children of Stone carved gods into mountain faces.',
  ),
  makeLocation(
    'chanca', 'Chanca Territory', 'Chanka Llaqta',
    -13.63, -73.20, 'chanca', [10, 20],
    'Tierra de los fieros guerreros Chanca, enemigos acerbos de los Incas. Uscovilca gobierna desde las sombras.',
    'Homeland of the fierce Chanca warriors, bitter enemies of the Inca. Uscovilca rules from the shadows.',
  ),
  makeLocation(
    'jungle', 'Antisuyu Jungle', 'Antisuyu',
    -11.00, -73.50, 'jungle', [11, 13],
    'La vasta selva oriental, reino del Antisuyu. Densa, humeda y llena de misterios antiguos.',
    'The vast eastern jungle, realm of the Antisuyu. Dense, humid, and full of ancient mysteries.',
  ),
  makeLocation(
    'kuelap', 'Kuelap', 'Kuelap',
    -6.42, -77.92, 'kuelap', [12],
    'Fortaleza de los Guerreros de las Nubes, los Chachapoya. Encaramada sobre las nubes en las tierras altas del norte.',
    'Fortress of the Cloud Warriors, the Chachapoya. Perched above the clouds in the northern highlands.',
  ),
  makeLocation(
    'choquequirao', 'Choquequirao', "Chuqi K'iraw",
    -13.39, -72.86, 'choquequirao', [14],
    'La Ciudad Oculta, hermana de Machu Picchu. Construida en un espolon montanoso sobre el abismo del Apurimac.',
    'The Hidden City, sister of Machu Picchu. Built on a mountain spur overlooking the Apurimac gorge.',
  ),
  makeLocation(
    'machu-picchu', 'Machu Picchu', 'Machu Pikchu',
    -13.16, -72.55, 'machu-picchu', [15],
    'El Arbol Dorado crece aqui. Una ciudad en las nubes que permaneceria oculta por siglos.',
    'The Golden Tree grows here. A city in the clouds that would remain hidden for centuries.',
  ),
  makeLocation(
    'aguas-calientes', 'Aguas Calientes', 'Kunun Yaku',
    -13.15, -72.52, 'aguas-calientes', [16],
    'Aguas termales al pie de Machu Picchu. Aqui llegan noticias que lo cambiaran todo.',
    'Hot springs at the foot of Machu Picchu. News arrives here that will change everything.',
  ),
  makeLocation(
    'titicaca', 'Lake Titicaca', 'Titiqaqa Qucha',
    -15.84, -69.33, 'titicaca', [17, 18],
    'Lago sagrado donde Manco Capac y Mama Ocllo emergieron. El Templo bajo el agua guarda un poder antiguo.',
    'Sacred lake where Manco Capac and Mama Ocllo emerged. The Temple beneath the water holds ancient power.',
  ),
  makeLocation(
    'tiahuanaco', 'Tiahuanaco', 'Tiwanaku',
    -16.55, -68.67, 'tiahuanaco', [19],
    'La Puerta del Sol. Ruinas de una civilizacion que precede a los Incas por mil anos.',
    'The Door of the Sun. Ruins of a civilization that predates even the Inca by a thousand years.',
  ),
  makeLocation(
    'yahuar-pampa', 'Yahuar Pampa', 'Yahuar Pampa',
    -13.63, -72.10, 'cusco-plains', [21, 22],
    'La Llanura de Sangre. Aqui la batalla decisiva entre Incas y Chancas determinara el destino de un imperio.',
    'The Plain of Blood. Here the decisive battle between Inca and Chanca will determine the fate of an empire.',
  ),
  makeLocation(
    'nazca', 'Nazca', 'Nasca',
    -14.84, -75.12, 'nazca', [],
    'Las misteriosas lineas del desierto. Figuras gigantes visibles solo desde el cielo, trazadas por manos antiguas.',
    'The mysterious desert lines. Giant figures visible only from the sky, traced by ancient hands.',
  ),
  makeLocation(
    'ollantaytambo', 'Ollantaytambo', 'Ullantaytampu',
    -13.26, -72.26, 'sacred-valley', [],
    'La fortaleza viviente del Valle Sagrado. Sus terrazas monoliticas desafian la gravedad y el tiempo.',
    'The living fortress of the Sacred Valley. Its monolithic terraces defy gravity and time.',
  ),
] as const;

/** Find the location that contains a given chapter number */
export function getLocationForChapter(chapterNumber: number): MapLocation | undefined {
  return MAP_LOCATIONS.find((loc) => loc.chapters.includes(chapterNumber));
}

/**
 * Journey path: chapter numbers in story order.
 * Used to draw the connecting line between locations on the map.
 */
export const JOURNEY_PATH: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
] as const;
