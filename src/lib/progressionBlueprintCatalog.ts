import type { ProgressionTreeImportance } from "@/lib/progressionGraph";

export type ProgressionRewardKind =
  | "message"
  | "gift"
  | "sticker_pack"
  | "canvas_tool"
  | "canvas_template"
  | "canvas_effect"
  | "page_frame"
  | "page_background"
  | "year_chapter"
  | "pdf_detail";

export type ProgressionTreePreset = {
  id: string;
  familyId: string;
  familyLabel: string;
  title: string;
  description: string;
  suggestedImportance: ProgressionTreeImportance;
  assetKey: string;
  accentColor: string;
};

export type ProgressionRewardTemplate = {
  id: string;
  familyId: string;
  familyLabel: string;
  kind: ProgressionRewardKind;
  title: string;
  description: string;
  referenceHint: string;
  payloadSeed: Record<string, unknown>;
};

type TreeFamilySeed = {
  id: string;
  label: string;
  accentColor: string;
  assetPrefix: string;
  titles: string[];
  descriptions: string[];
};

const TREE_FAMILY_SEEDS: TreeFamilySeed[] = [
  {
    id: "origen",
    label: "Origen compartido",
    accentColor: "#e8f5e7",
    assetPrefix: "origin",
    titles: [
      "Semilla fundadora",
      "Primer gesto elegido",
      "Pacto de inicio",
      "Camino que arranca",
      "Raiz compartida",
      "Primer refugio",
      "Complicidad naciente",
      "Origen recordado",
      "Inicio con voz propia",
      "Primera rama estable",
    ],
    descriptions: [
      "Marca el nacimiento consciente del jardín y el punto desde el que todo empieza a tener historia.",
      "Reconoce el primer gesto pequeño que ya llevaba intención de pareja y no solo azar.",
      "Convierte un acuerdo afectivo en rama visible del sendero.",
      "Hace visible que la historia ya no es una suma de recuerdos aislados, sino recorrido.",
      "Da forma a la primera raiz que sostiene varias memorias posteriores.",
      "Nombra el primer lugar emocional donde el jardín se siente a salvo.",
      "Reconoce la primera forma de complicidad que ya puede verse desde fuera.",
      "Relee el origen con perspectiva y lo vuelve capítulo.",
      "Hace que el inicio deje de ser borroso y gane una identidad propia.",
      "Cierra la primera decena simbólica del origen y la vuelve estable.",
    ],
  },
  {
    id: "cuidado",
    label: "Cuidado y constancia",
    accentColor: "#eef7ec",
    assetPrefix: "care",
    titles: [
      "Riego compartido",
      "Cuidado paciente",
      "Semilla rescatada",
      "Constancia suave",
      "Rutina que cuida",
      "Proteccion mutua",
      "Tramo sostenido",
      "Flor cuidada juntos",
      "Temporada de mimo",
      "Raiz de permanencia",
    ],
    descriptions: [
      "Reconoce que el cuidado ya no depende de un solo gesto aislado, sino de presencia compartida.",
      "Hace visible la paciencia como forma de amor practicado.",
      "Convierte un rescate emocional o practico en hito del sendero.",
      "Premia una constancia pequeña pero real que sostiene la historia.",
      "Da forma de hito a un hábito que ya protege la relación.",
      "Visibiliza que el cuidado se ha vuelto reciproco y legible.",
      "Marca un periodo mantenido en el tiempo y no solo un instante bonito.",
      "Transforma una floración bien cuidada en rama propia del árbol.",
      "Reconoce una temporada en la que el cuidado ha sido protagonista.",
      "Cierra una capa de continuidad que ya sostiene otras ramas del jardín.",
    ],
  },
  {
    id: "hogar",
    label: "Hogar y refugio",
    accentColor: "#f3efe7",
    assetPrefix: "home",
    titles: [
      "Casa habitada",
      "Rincon propio",
      "Refugio de lluvia",
      "Mesa con memoria",
      "Rutina del hogar",
      "Noche de cobijo",
      "Detalles que abrigan",
      "Refugio consolidado",
      "Templo cotidiano",
      "Raiz domestica",
    ],
    descriptions: [
      "Reconoce el momento en que la casa deja de ser escenario y se vuelve parte del jardín.",
      "Hace visible un rincon que ya tiene significado emocional repetido.",
      "Convierte una memoria de refugio en un nodo estable del sendero.",
      "Nombra una escena domestica que ya concentra historia compartida.",
      "Hace visible una rutina de hogar que protege la relación.",
      "Reconoce una noche en la que la casa actuo como cuidado activo.",
      "Premia los pequenos detalles que vuelven habitable la historia comun.",
      "Consolida la sensacion de hogar como una rama fuerte del árbol.",
      "Da estatuto de hito a un modo cotidiano de estar juntos.",
      "Cierra el capítulo domestico inicial como fundamento del bosque.",
    ],
  },
  {
    id: "viaje",
    label: "Viajes y desplazamientos",
    accentColor: "#eef5fb",
    assetPrefix: "travel",
    titles: [
      "Ruta estrenada",
      "Desvio memorable",
      "Paseo que vuelve",
      "Viaje que abre rama",
      "Parada importante",
      "Camino elegido",
      "Lugar que llama",
      "Retorno transformado",
      "Trayecto con historia",
      "Mapa con huella",
    ],
    descriptions: [
      "Reconoce un desplazamiento que ya no es solo trayecto, sino parte del relato.",
      "Premia un desvio que termina siendo mejor historia que el plan inicial.",
      "Convierte un paseo repetido en ritual con peso propio.",
      "Marca un viaje que abre una familia entera de recuerdos.",
      "Da relieve a una parada que se vuelve referencia emocional.",
      "Hace visible que el camino también fue una decision afectiva.",
      "Nombra un lugar que ya convoca por si solo el deseo de volver.",
      "Reconoce que regresar a un sitio también cambia la historia.",
      "Consolida un trayecto como infraestructura emocional de la pareja.",
      "Cierra una rama espacial donde mapa y memoria ya van unidos.",
    ],
  },
  {
    id: "celebracion",
    label: "Celebraciones y brillo",
    accentColor: "#fff6e8",
    assetPrefix: "celebration",
    titles: [
      "Luz compartida",
      "Sorpresa lograda",
      "Fecha que brilla",
      "Noche celebrada",
      "Meta festejada",
      "Rama luminosa",
      "Aniversario contado",
      "Aplauso mutuo",
      "Fiesta con memoria",
      "Oro del recorrido",
    ],
    descriptions: [
      "Hace visible una celebración que deja de ser efímera para convertirse en historia.",
      "Reconoce una sorpresa que no solo emociono, sino que inauguro rama.",
      "Da forma a una fecha importante que ya puede leerse como hito.",
      "Marca una noche de brillo compartido dentro del sendero.",
      "Premia una meta alcanzada que merecia una expresión propia en el árbol.",
      "Abre una familia de recuerdos donde la energía principal es la celebración.",
      "Convierte el aniversario en estructura narrativa, no solo en evento.",
      "Visibiliza el reconocimiento reciproco como combustible del jardín.",
      "Hace que la fiesta deje huella y no solo resplandor momentaneo.",
      "Reserva un hito más alto para momentos de celebración ya estructural.",
    ],
  },
  {
    id: "profundidad",
    label: "Memoria profunda",
    accentColor: "#eef0fb",
    assetPrefix: "depth",
    titles: [
      "Página que respira",
      "Memoria con capas",
      "Voz que responde",
      "Lugar que pesa",
      "Lienzo con sentido",
      "Página que explica",
      "Reflexion compartida",
      "Memoria editorial",
      "Capítulo intimo",
      "Raiz narrativa",
    ],
    descriptions: [
      "Premia una página que ya tiene espesor y no solo presencia.",
      "Reconoce una memoria con varias capas expresivas bien cosidas.",
      "Marca el momento en que una voz responde a otra dentro del mismo relato.",
      "Da relieve a un lugar que ya pesa por su lectura emocional.",
      "Visibiliza un uso del canvas que aporta significado real.",
      "Convierte una página ejemplar en nodo visible del árbol.",
      "Hace visible la doble mirada como forma madura de memoria.",
      "Reconoce una página que pide pasar a year o PDF por su propia fuerza.",
      "Reserva un hito mayor para escenas de profundidad poco frecuente.",
      "Cierra un tramo donde la memoria ya actua como arquitectura del proyecto.",
    ],
  },
  {
    id: "continuidad",
    label: "Revisitas y continuidad",
    accentColor: "#edf6f1",
    assetPrefix: "continuity",
    titles: [
      "Regreso con sentido",
      "Promesa respondida",
      "Símbolo que vuelve",
      "Segunda forma",
      "Lugar que madura",
      "Motivo repetido",
      "Capa sobre capa",
      "Tradicion elegida",
      "Rama que resiste",
      "Constelacion continua",
    ],
    descriptions: [
      "Reconoce que volver a algo importante también hace crecer el jardín.",
      "Hace visible una promesa que por fin encuentra su respuesta.",
      "Premia un símbolo recurrente que ya puede leerse como motivo del año.",
      "Da forma a una segunda version de un mismo ritual o gesto.",
      "Muestra que un lugar puede crecer con vosotros y no solo repetirse.",
      "Visibiliza una recurrencia que ya sostiene narrativa propia.",
      "Reconoce cuando varias memorias se superponen sin perder claridad.",
      "Convierte una costumbre elegida en estructura del bosque.",
      "Marca la permanencia como valor, no solo la novedad.",
      "Cierra una familia de continuidad como constelación madura.",
    ],
  },
  {
    id: "promesa",
    label: "Futuro y promesas",
    accentColor: "#f5eefb",
    assetPrefix: "future",
    titles: [
      "Promesa sembrada",
      "Llave del futuro",
      "Mensaje hacia delante",
      "Capsula latente",
      "Promesa que vuelve",
      "Ciclo que se abre",
      "Ciclo que se cierra",
      "Árbol real invocado",
      "Futuro compartido",
      "Legado en marcha",
    ],
    descriptions: [
      "Hace visible el momento en que el jardín deja de mirar solo al pasado.",
      "Marca un gesto que deja algo preparado para más adelante.",
      "Reconoce un mensaje formulado para ser releido en otro tiempo.",
      "Reserva un nodo para las capsulas y los retrasos fertiles.",
      "Premia el regreso de una promesa ya sembrada con tiempo.",
      "Abre un nuevo ciclo del proyecto y de la relación.",
      "Cierra con conciencia una etapa larga sin romper la historia.",
      "Reserva un hito mayor para el ritual de plantar un árbol real.",
      "Da forma a un futuro que ya se puede imaginar con nitidez.",
      "Cierra la familia de futuro como legado vivo del jardín.",
    ],
  },
  {
    id: "bosque",
    label: "Bosque y lectura anual",
    accentColor: "#edf7f7",
    assetPrefix: "forest",
    titles: [
      "Año que despierta",
      "Lectura del capítulo",
      "Tronco del año",
      "Rama anual visible",
      "Resumen con relieve",
      "Bosque que responde",
      "Patron del año",
      "Anillo del tiempo",
      "Árbol del capítulo",
      "Cosecha anual",
    ],
    descriptions: [
      "Reconoce el momento en que el año empieza a leerse como bloque narrativo.",
      "Hace visible un capítulo anual ya suficientemente claro.",
      "Da al año un tronco central dentro del bosque.",
      "Premia una rama que ya no es solo sendero sino lectura anual.",
      "Convierte el resumen del año en hito estructural.",
      "Marca cuando forest deja de ser solo decorado y responde al recorrido.",
      "Hace visible un patrón repetido dentro de un mismo año.",
      "Reconoce la capa temporal larga del proyecto.",
      "Reserva un hito mayor para capítulos anuales muy claros.",
      "Cierra un año con forma de cosecha reconocible.",
    ],
  },
  {
    id: "legado",
    label: "Legado y expansion",
    accentColor: "#f6f3ec",
    assetPrefix: "legacy",
    titles: [
      "Huella compartida",
      "Capítulo que perdura",
      "Rama de legado",
      "Historia que trasciende",
      "Memoria fundacional",
      "Nodo de referencia",
      "Árbol mayor",
      "Ancla del proyecto",
      "Raiz de legado",
      "Cima narrativa",
    ],
    descriptions: [
      "Reconoce una huella que ya no pertenece solo al dia en que ocurrio.",
      "Premia un capítulo que se queda como referencia del proyecto.",
      "Abre una rama de legado para momentos que siguen irradiando.",
      "Hace visible que una historia concreta ya cambia la lectura de las demas.",
      "Reserva un lugar para memorias fundacionales y muy poco frecuentes.",
      "Marca un nodo que servira de referencia para otras ramas.",
      "Guarda los hitos mayores que merecen estatura propia.",
      "Convierte un momento clave en ancla narrativa del sistema.",
      "Da profundidad a la idea de legado dentro del bosque.",
      "Reserva la cima para lo que de verdad cambia la historia compartida.",
    ],
  },
];

export const PROGRESSION_TREE_PRESETS: ProgressionTreePreset[] =
  TREE_FAMILY_SEEDS.flatMap((family) =>
    family.titles.map((title, index) => ({
      id: `${family.id}_${String(index + 1).padStart(2, "0")}`,
      familyId: family.id,
      familyLabel: family.label,
      title,
      description: family.descriptions[index] ?? family.descriptions[0] ?? title,
      suggestedImportance:
        index >= 9
          ? "anual"
          : index >= 7
            ? "mayor"
            : index >= 3
              ? "importante"
              : "paso",
      assetKey: `${family.assetPrefix}_${String(index + 1).padStart(2, "0")}`,
      accentColor: family.accentColor,
    })),
  );

type RewardFamilySeed = {
  id: string;
  label: string;
  tone: string;
  referencePrefix: string;
};

const REWARD_FAMILIES: RewardFamilySeed[] = [
  { id: "intimidad", label: "Intimidad", tone: "calidez", referencePrefix: "intimacy" },
  { id: "hogar", label: "Hogar", tone: "abrigo", referencePrefix: "home" },
  { id: "viaje", label: "Viaje", tone: "descubrimiento", referencePrefix: "travel" },
  { id: "celebracion", label: "Celebracion", tone: "brillo", referencePrefix: "celebration" },
  { id: "botánica", label: "Botánica", tone: "crecimiento", referencePrefix: "botanic" },
  { id: "sendero", label: "Sendero", tone: "avance", referencePrefix: "trail" },
  { id: "bosque", label: "Bosque", tone: "profundidad", referencePrefix: "forest" },
  { id: "year", label: "Capítulo anual", tone: "editorial", referencePrefix: "year" },
  { id: "pdf", label: "Libro", tone: "edición", referencePrefix: "pdf" },
  { id: "promesa", label: "Promesa", tone: "futuro", referencePrefix: "future" },
];

const REWARD_VARIANTS: Array<{
  id: string;
  kind: ProgressionRewardKind;
  title: string;
  description: string;
  referenceSuffix: string;
  payloadSeed: (family: RewardFamilySeed) => Record<string, unknown>;
}> = [
  {
    id: "message_letter",
    kind: "message",
    title: "Carta suave",
    description: "Desbloquea un mensaje especial que aparece como gesto de cuidado o celebración.",
    referenceSuffix: "message-letter",
    payloadSeed: (family) => ({
      text: `Mensaje ${family.tone} desbloqueado para ${family.label.toLowerCase()}.`,
    }),
  },
  {
    id: "gift_ritual",
    kind: "gift",
    title: "Regalo ritual",
    description: "Desbloquea una sugerencia de gesto bonito y accionable dentro de la experiencia.",
    referenceSuffix: "gift-ritual",
    payloadSeed: (family) => ({
      description: `Regalo o gesto ${family.tone} para celebrar ${family.label.toLowerCase()}.`,
    }),
  },
  {
    id: "sticker_constellation",
    kind: "sticker_pack",
    title: "Pack de stickers",
    description: "Activa un set visual para expresar mejor este tipo de hito en canvas o página.",
    referenceSuffix: "stickers",
    payloadSeed: (family) => ({
      packName: `Pack ${family.label}`,
      stickers: [
        `${family.referencePrefix}_spark`,
        `${family.referencePrefix}_leaf`,
        `${family.referencePrefix}_trace`,
      ],
    }),
  },
  {
    id: "canvas_tool",
    kind: "canvas_tool",
    title: "Herramienta de canvas",
    description: "Añade una herramienta o capacidad creativa nueva al lienzo.",
    referenceSuffix: "canvas-tool",
    payloadSeed: (family) => ({
      toolKey: `${family.referencePrefix}_brush`,
      unlock: "canvas_tool",
    }),
  },
  {
    id: "canvas_template",
    kind: "canvas_template",
    title: "Template de canvas",
    description: "Desbloquea una composición reutilizable para construir páginas con más riqueza.",
    referenceSuffix: "canvas-template",
    payloadSeed: (family) => ({
      templateKey: `${family.referencePrefix}_spread`,
      unlock: "canvas_template",
    }),
  },
  {
    id: "canvas_effect",
    kind: "canvas_effect",
    title: "Efecto de canvas",
    description: "Activa un tratamiento visual nuevo para expresar capas o atmosfera.",
    referenceSuffix: "canvas-effect",
    payloadSeed: (family) => ({
      effectKey: `${family.referencePrefix}_glow`,
      unlock: "canvas_effect",
    }),
  },
  {
    id: "page_frame",
    kind: "page_frame",
    title: "Marco de página",
    description: "Añade un marco o envolvente visual para momentos destacados.",
    referenceSuffix: "page-frame",
    payloadSeed: (family) => ({
      frameKey: `${family.referencePrefix}_frame`,
      unlock: "page_frame",
    }),
  },
  {
    id: "page_background",
    kind: "page_background",
    title: "Fondo de página",
    description: "Desbloquea un fondo ambiental para memorias con personalidad propia.",
    referenceSuffix: "page-background",
    payloadSeed: (family) => ({
      backgroundKey: `${family.referencePrefix}_background`,
      unlock: "page_background",
    }),
  },
  {
    id: "year_chapter",
    kind: "year_chapter",
    title: "Detalle de year",
    description: "Abre un tratamiento o modulo editorial para el capítulo anual.",
    referenceSuffix: "year-chapter",
    payloadSeed: (family) => ({
      chapterKey: `${family.referencePrefix}_year_detail`,
      unlock: "year_chapter",
    }),
  },
  {
    id: "pdf_detail",
    kind: "pdf_detail",
    title: "Detalle de PDF",
    description: "Desbloquea un recurso de maquetacion o portada para el libro exportado.",
    referenceSuffix: "pdf-detail",
    payloadSeed: (family) => ({
      pdfKey: `${family.referencePrefix}_pdf_detail`,
      unlock: "pdf_detail",
    }),
  },
];

export const PROGRESSION_REWARD_TEMPLATES: ProgressionRewardTemplate[] =
  REWARD_FAMILIES.flatMap((family) =>
    REWARD_VARIANTS.map((variant) => ({
      id: `${family.id}_${variant.id}`,
      familyId: family.id,
      familyLabel: family.label,
      kind: variant.kind,
      title: `${variant.title} · ${family.label}`,
      description: `${variant.description} Mantiene el tono de ${family.label.toLowerCase()} dentro del proyecto.`,
      referenceHint: `${family.referencePrefix}_${variant.referenceSuffix}`,
      payloadSeed: variant.payloadSeed(family),
    })),
  );

export const PROGRESSION_REWARD_KIND_LABELS: Record<ProgressionRewardKind, string> = {
  message: "Mensaje",
  gift: "Regalo",
  sticker_pack: "Pack de stickers",
  canvas_tool: "Herramienta de canvas",
  canvas_template: "Template de canvas",
  canvas_effect: "Efecto de canvas",
  page_frame: "Marco de página",
  page_background: "Fondo de página",
  year_chapter: "Detalle de year",
  pdf_detail: "Detalle de PDF",
};
