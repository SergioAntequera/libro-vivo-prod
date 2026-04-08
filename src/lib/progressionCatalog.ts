export type ProgressionConditionCategory =
  | "primeras_veces"
  | "rituales_compartidos"
  | "profundidad_memoria"
  | "lugares_significativos"
  | "estaciones_y_tiempo"
  | "cuidado_compartido"
  | "revisitas_y_continuidad"
  | "celebraciones"
  | "ramas_y_capitulos"
  | "futuro_y_promesas";

export type ProgressionRewardHint =
  | "message"
  | "gift"
  | "sticker_pack"
  | "template"
  | "frame"
  | "background"
  | "canvas_detail";

export type ProgressionConditionTemplate = {
  id: string;
  category: ProgressionConditionCategory;
  title: string;
  description: string;
  narrativeSeed: string;
  suggestedRewardHint: ProgressionRewardHint;
};

function condition(
  id: string,
  category: ProgressionConditionCategory,
  title: string,
  description: string,
  narrativeSeed: string,
  suggestedRewardHint: ProgressionRewardHint,
): ProgressionConditionTemplate {
  return {
    id,
    category,
    title,
    description,
    narrativeSeed,
    suggestedRewardHint,
  };
}

export const PROGRESSION_CONDITION_TEMPLATES: ProgressionConditionTemplate[] = [
  condition("first_seed_together", "primeras_veces", "Primera semilla sembrada juntos", "Se activa cuando una semilla nace como gesto compartido real dentro del jardín.", "Marca el arranque consciente del jardín.", "message"),
  condition("first_water_family_plan", "primeras_veces", "Primera experiencia de agua", "Se activa al vivir la primera memoria ligada a la familia agua.", "Abre la rama serena del recorrido.", "sticker_pack"),
  condition("first_fire_family_plan", "primeras_veces", "Primera experiencia de fuego", "Se activa al vivir la primera memoria ligada a la familia fuego.", "Enciende la rama intensa del recorrido.", "background"),
  condition("first_earth_family_plan", "primeras_veces", "Primera experiencia de tierra", "Se activa al vivir la primera memoria ligada a la familia tierra.", "Asienta la rama de naturaleza y refugio.", "frame"),
  condition("first_air_family_plan", "primeras_veces", "Primera experiencia de aire", "Se activa al vivir la primera memoria ligada a la familia aire.", "Abre la rama de improvisacion y ligereza.", "sticker_pack"),
  condition("first_light_family_plan", "primeras_veces", "Primera experiencia de luz", "Se activa al vivir la primera memoria ligada a la familia luz.", "Señala una celebración luminosa del jardín.", "template"),
  condition("first_moon_family_plan", "primeras_veces", "Primera experiencia de luna", "Se activa al vivir la primera memoria ligada a la familia luna.", "Abre la rama de intimidad y escucha.", "message"),
  condition("first_star_family_plan", "primeras_veces", "Primera experiencia de estrella", "Se activa al vivir la primera memoria ligada a la familia estrella.", "Marca el comienzo de los suenos compartidos.", "canvas_detail"),
  condition("first_page_with_voice", "primeras_veces", "Primera memoria con audio", "Se activa cuando una página guarda por primera vez una voz o sonido con sentido.", "Hace que el jardín gane presencia viva.", "message"),
  condition("first_page_with_place", "primeras_veces", "Primera memoria con lugar simbólico", "Se activa cuando una página queda anclada a un lugar con valor para la pareja.", "El jardín toca el mundo real por primera vez.", "frame"),

  condition("first_joint_watering", "rituales_compartidos", "Primer riego compartido", "Se activa cuando una semilla se riega entre las dos personas y culmina el gesto conjunto.", "Convierte el cuidado en ritual visible.", "message"),
  condition("first_spontaneous_plan_lived", "rituales_compartidos", "Primer plan espontaneo vivido", "Se activa cuando una idea ligera termina convertida en memoria real.", "El jardín aprende a florecer sin rigidez.", "sticker_pack"),
  condition("first_rescheduled_plan_kept", "rituales_compartidos", "Primer plan reprogramado que se mantiene", "Se activa al salvar un plan movido de fecha que aun así llega a vivirse.", "Da valor a la constancia flexible.", "gift"),
  condition("weekday_ritual_begins", "rituales_compartidos", "Nace un ritual semanal", "Se activa cuando una misma energía compartida empieza a repetirse con identidad propia.", "La pareja inaugura un pequeño hábito del jardín.", "template"),
  condition("first_morning_ritual_page", "rituales_compartidos", "Primer ritual de mañana", "Se activa cuando una memoria deja constancia de una rutina temprana con sentido.", "Abre una rama de cotidianeidad bonita.", "background"),
  condition("first_night_ritual_page", "rituales_compartidos", "Primer ritual de noche", "Se activa cuando una memoria nocturna adquiere peso de costumbre compartida.", "La intimidad gana forma repetible.", "frame"),
  condition("home_ritual_settles", "rituales_compartidos", "Se asienta un ritual en casa", "Se activa cuando una experiencia domestica deja de ser aislada y se convierte en gesto reconocible.", "El hogar se vuelve territorio del jardín.", "canvas_detail"),
  condition("season_opening_ritual", "rituales_compartidos", "Ritual de apertura de estación", "Se activa cuando una estación arranca con un gesto o memoria muy marcada.", "Cada estación empieza a tener ceremonia propia.", "template"),
  condition("season_closing_ritual", "rituales_compartidos", "Ritual de cierre de estación", "Se activa cuando una estación se cierra con una memoria de balance o despedida.", "La historia aprende a cerrar ciclos.", "message"),
  condition("shared_walk_route_ritual", "rituales_compartidos", "Ruta de paseo convertida en ritual", "Se activa cuando un paseo o trayecto se repite con peso afectivo.", "Un camino normal se vuelve propio.", "sticker_pack"),

  condition("page_full_senses", "profundidad_memoria", "Memoria con todos los sentidos", "Se activa cuando una página suma texto, imagen, sonido y lugar de forma coherente.", "La memoria deja de ser apunte y se vuelve escena.", "template"),
  condition("both_reflections_same_page", "profundidad_memoria", "Miradas de ambos en la misma página", "Se activa cuando la memoria recoge reflexion o voz de ambas personas.", "La página se hace verdaderamente compartida.", "message"),
  condition("future_promise_recorded_in_page", "profundidad_memoria", "Promesa sembrada dentro de una memoria", "Se activa cuando una página no solo recuerda, sino que promete algo al futuro.", "La memoria empuja el tiempo hacia delante.", "canvas_detail"),
  condition("page_answers_old_memory", "profundidad_memoria", "Una memoria responde a otra anterior", "Se activa cuando una página cita, responde o da continuidad a otra memoria antigua.", "Las páginas empiezan a conversar entre si.", "frame"),
  condition("manual_canvas_becomes_meaningful", "profundidad_memoria", "El lienzo aporta sentido real", "Se activa cuando el uso de canvas no es decoración y si parte del significado de la página.", "La expresión visual madura.", "canvas_detail"),
  condition("page_becomes_editorial_candidate", "profundidad_memoria", "Memoria con potencial editorial", "Se activa cuando una página sobresale como candidata natural para year o PDF.", "La historia pide ser contada en grande.", "template"),
  condition("voice_answer_pair", "profundidad_memoria", "Respuesta en audio dentro de la misma memoria", "Se activa cuando la voz de una persona responde a la otra en el mismo recuerdo.", "La memoria se escucha en dos tiempos.", "message"),
  condition("symbolic_place_plus_reflection", "profundidad_memoria", "Lugar simbólico con reflexion profunda", "Se activa cuando lugar y reflexion se refuerzan mutuamente dentro de una página.", "El sitio deja huella narrativa.", "background"),
  condition("route_memory_with_context", "profundidad_memoria", "Memoria asociada a ruta con contexto real", "Se activa cuando una ruta no es solo decorado y queda contada con sentido en una página.", "Movimiento y memoria se atan entre si.", "sticker_pack"),
  condition("seasonal_meaning_page", "profundidad_memoria", "Memoria que explica una estación", "Se activa cuando una página encarna claramente el tono de una estación concreta.", "Una sola flor ayuda a leer el año.", "template"),

  condition("first_saved_symbolic_place", "lugares_significativos", "Primer lugar guardado con símbolo", "Se activa al registrar un sitio que ya significa algo para la pareja.", "El mapa deja de ser utilitario y se vuelve afectivo.", "frame"),
  condition("favorite_place_returns", "lugares_significativos", "Vuelve un lugar favorito", "Se activa cuando una memoria regresa a un lugar que ya habia sido importante.", "El lugar se consolida como refugio del jardín.", "background"),
  condition("new_place_with_weight", "lugares_significativos", "Lugar nuevo con peso propio", "Se activa cuando una memoria estrena un sitio que ya entra con fuerza en la historia.", "El mapa gana una nueva referencia emocional.", "sticker_pack"),
  condition("home_route_marked", "lugares_significativos", "Ruta de casa convertida en trayecto propio", "Se activa cuando un recorrido cotidiano adquiere valor de escena compartida.", "Lo comun empieza a tener relieve.", "canvas_detail"),
  condition("sunset_spot_named", "lugares_significativos", "Aparece un lugar de atardecer", "Se activa cuando una memoria fija un sitio vinculado a un momento de luz especial.", "El paisaje entra en la mitologia del jardín.", "background"),
  condition("water_place_claimed", "lugares_significativos", "Aparece un lugar de agua especial", "Se activa cuando un sitio ligado a mar, rio o lluvia queda unido al relato de pareja.", "La familia agua encuentra territorio propio.", "frame"),
  condition("forest_place_claimed", "lugares_significativos", "Aparece un lugar de bosque especial", "Se activa cuando un sitio de naturaleza espesa se vuelve memoria recurrente.", "La rama tierra gana hondura.", "sticker_pack"),
  condition("city_place_redeemed", "lugares_significativos", "La ciudad se vuelve lugar significativo", "Se activa cuando un espacio urbano deja de ser paso y se convierte en escena importante.", "La historia ocupa también lo cotidiano.", "template"),
  condition("trip_place_becomes_marker", "lugares_significativos", "Un viaje deja un punto de referencia", "Se activa cuando un lugar de viaje sigue importando después de volver.", "La historia aprende a expandirse.", "message"),
  condition("place_revisited_with_growth", "lugares_significativos", "Un lugar cambia con vosotros", "Se activa cuando al volver a un sitio la memoria deja ver crecimiento o diferencia.", "El mapa guarda transformacion, no solo ubicacion.", "canvas_detail"),

  condition("spring_story_opens", "estaciones_y_tiempo", "Primera historia de primavera", "Se activa cuando una memoria inaugura de verdad la primavera del jardín.", "El año empieza a respirar verde.", "background"),
  condition("summer_story_opens", "estaciones_y_tiempo", "Primera historia de verano", "Se activa cuando una memoria inaugura de verdad el verano del jardín.", "La energía del año se ensancha.", "sticker_pack"),
  condition("autumn_story_opens", "estaciones_y_tiempo", "Primera historia de otoño", "Se activa cuando una memoria inaugura de verdad el otoño del jardín.", "El jardín aprende a cosechar y soltar.", "frame"),
  condition("winter_story_opens", "estaciones_y_tiempo", "Primera historia de invierno", "Se activa cuando una memoria inaugura de verdad el invierno del jardín.", "El refugio se vuelve parte de la historia.", "message"),
  condition("season_fully_inhabited", "estaciones_y_tiempo", "Estación vivida de punta a punta", "Se activa cuando una estación deja suficientes huellas como para leerse como capítulo.", "El año gana estructura real.", "template"),
  condition("season_changes_with_bloom", "estaciones_y_tiempo", "Cambio de estación con floración", "Se activa cuando un cambio de estación coincide con una semilla que florece.", "La vida del jardín se alinea con el tiempo.", "canvas_detail"),
  condition("anniversary_in_new_season", "estaciones_y_tiempo", "Aniversario en una nueva estación", "Se activa cuando una fecha importante reaparece bajo una luz distinta del año.", "El tiempo repite sin ser igual.", "gift"),
  condition("solstice_or_equinox_memory", "estaciones_y_tiempo", "Memoria de solsticio o equinoccio", "Se activa cuando una memoria cae sobre un umbral fuerte del calendario natural.", "El jardín toca un punto de giro del año.", "message"),
  condition("rain_day_memory", "estaciones_y_tiempo", "Memoria de lluvia con significado", "Se activa cuando la lluvia deja de ser contexto y se vuelve tono del recuerdo.", "La atmosfera entra en la historia.", "background"),
  condition("clear_night_memory", "estaciones_y_tiempo", "Memoria de noche despejada", "Se activa cuando el cielo o la claridad nocturna forman parte del significado.", "La noche se vuelve escena compartida.", "frame"),

  condition("seed_bloomed_after_waiting", "cuidado_compartido", "Una semilla prospera después de esperar", "Se activa cuando una semilla tarda, pero acaba floreciendo con sentido.", "El cuidado demuestra paciencia.", "message"),
  condition("seed_bloomed_after_rescue", "cuidado_compartido", "Una semilla es rescatada", "Se activa cuando un plan parecía perderse y aun así termina floreciendo.", "El jardín aprende a salvar lo fragil.", "gift"),
  condition("seed_bloomed_with_place_attached", "cuidado_compartido", "Semilla florecida con lugar ya integrado", "Se activa cuando la semilla llega a memoria llevando ya su geografia propia.", "Futuro y mapa se tocaron bien.", "sticker_pack"),
  condition("seed_bloomed_with_story_ready", "cuidado_compartido", "Semilla florecida con historia clara", "Se activa cuando el plan no solo se vive, sino que aterriza en página con sentido inmediato.", "La agenda se convierte en relato sin fricción.", "template"),
  condition("idea_to_memory_complete_arc", "cuidado_compartido", "Arco completo de idea a memoria", "Se activa cuando una idea ligera termina cerrando el ciclo entero hasta página viva.", "El sistema se demuestra a si mismo.", "canvas_detail"),
  condition("replanned_seed_still_blooms", "cuidado_compartido", "Semilla reprogramada que termina bien", "Se activa cuando una semilla movida de fecha no pierde su fuerza y acaba floreciendo.", "La pareja sostiene lo que importa.", "message"),
  condition("seed_bloomed_with_both_voices", "cuidado_compartido", "Floración con voz compartida", "Se activa cuando la semilla desemboca en una página con presencia de ambas personas.", "El cuidado termina en memoria compartida.", "frame"),
  condition("seed_becomes_highlight_page", "cuidado_compartido", "Semilla que acaba como destacada", "Se activa cuando una semilla termina generando una página con peso editorial.", "Un gesto cotidiano escala a capítulo.", "template"),
  condition("seed_bloomed_on_special_day", "cuidado_compartido", "Floración en fecha significativa", "Se activa cuando el florecimiento coincide con un dia simbólico.", "Tiempo y cuidado se alinean.", "gift"),
  condition("family_branch_care_matures", "cuidado_compartido", "Una familia botánica madura por cuidado", "Se activa cuando una familia deja de ser anecdota y gana continuidad por repeticion con sentido.", "La botánica del jardín se vuelve legible.", "background"),

  condition("place_revisited_new_layer", "revisitas_y_continuidad", "Un lugar gana una nueva capa", "Se activa cuando una vuelta a un sitio no repite la misma memoria, sino que la amplifica.", "La historia se pliega sobre si misma.", "canvas_detail"),
  condition("plan_type_returns_changed", "revisitas_y_continuidad", "Vuelve un tipo de plan transformado", "Se activa cuando una misma energía reaparece con otra madurez.", "La pareja no se repite, evoluciona.", "frame"),
  condition("old_promise_gets_answer", "revisitas_y_continuidad", "Una promesa antigua encuentra respuesta", "Se activa cuando una memoria posterior cumple o responde a algo prometido antes.", "El jardín recuerda lo que dijo.", "message"),
  condition("return_to_first_route", "revisitas_y_continuidad", "Se vuelve al primer trayecto", "Se activa cuando una ruta o paseo fundador reaparece con conciencia de origen.", "El camino mira hacia atras con carino.", "background"),
  condition("old_page_reopened_with_new_reflection", "revisitas_y_continuidad", "Una página antigua vuelve a hablar", "Se activa cuando una memoria vieja recibe una nueva lectura con peso.", "El archivo sigue vivo.", "template"),
  condition("ritual_second_form", "revisitas_y_continuidad", "Un ritual encuentra una segunda forma", "Se activa cuando un hábito compartido se reinventa sin romperse.", "La continuidad aprende a mutar.", "sticker_pack"),
  condition("same_symbol_new_season", "revisitas_y_continuidad", "Un símbolo reaparece en otra estación", "Se activa cuando una imagen, gesto o idea regresa bajo otra luz del año.", "El jardín crea motivos propios.", "canvas_detail"),
  condition("first_date_recalled_later", "revisitas_y_continuidad", "Una primera cita es releida más tarde", "Se activa cuando una memoria fundacional vuelve a ser nombrada o reinterpretada.", "El origen entra en dialogo con el presente.", "message"),
  condition("symbolic_day_returns_year_later", "revisitas_y_continuidad", "Vuelve un dia simbólico al año siguiente", "Se activa cuando una fecha importante regresa y deja nueva huella.", "La historia empieza a tener estaciones internas.", "gift"),
  condition("place_becomes_tradition", "revisitas_y_continuidad", "Un lugar se convierte en tradicion", "Se activa cuando un sitio deja de ser hallazgo y se vuelve costumbre elegida.", "El mapa gana un santuario compartido.", "background"),

  condition("first_anniversary_page", "celebraciones", "Primer aniversario contado", "Se activa cuando el aniversario entra en página con peso propio.", "La celebración se vuelve memoria estructural.", "template"),
  condition("anniversary_with_location", "celebraciones", "Aniversario anclado a un lugar", "Se activa cuando una fecha central queda unida a un sitio significativo.", "La celebración también ocupa el mapa.", "frame"),
  condition("shared_birthday_memory", "celebraciones", "Cumpleaños vivido como recuerdo fuerte", "Se activa cuando un cumpleaños deja una memoria con densidad emocional.", "La alegria entra en el jardín como capítulo.", "gift"),
  condition("light_family_celebration", "celebraciones", "Celebracion de la familia luz", "Se activa cuando una memoria luminosa y festiva adquiere relieve claro dentro del jardín.", "La rama luz gana su emblema.", "background"),
  condition("goal_reached_together", "celebraciones", "Meta alcanzada juntos", "Se activa cuando una meta o deseo compartido se cumple y se recuerda como tal.", "El esfuerzo entra en la narrativa de pareja.", "message"),
  condition("surprise_memory_opens", "celebraciones", "Sorpresa que deja huella", "Se activa cuando una sorpresa no es solo gesto, sino recuerdo fundador.", "La historia aprende a celebrar lo inesperado.", "sticker_pack"),
  condition("special_night_marked", "celebraciones", "Noche especial marcada", "Se activa cuando una noche adquiere rango de evento y no de simple salida.", "La intensidad encuentra su nodo.", "frame"),
  condition("special_trip_marked", "celebraciones", "Viaje especial marcado", "Se activa cuando un viaje se recuerda como salto claro dentro del relato.", "La historia se expande y se condensa a la vez.", "template"),
  condition("new_year_memory", "celebraciones", "Memoria de nuevo año", "Se activa cuando el cambio de año queda contado desde dentro del jardín.", "El calendario comun gana puerta propia.", "background"),
  condition("year_closure_memory", "celebraciones", "Cierre del año con memoria fuerte", "Se activa cuando el final de año se vive como balance, fiesta o despedida con peso.", "El año aprende a cerrarse narrativamente.", "gift"),

  condition("complete_water_branch", "ramas_y_capitulos", "Se completa una rama de agua", "Se activa cuando la familia agua alcanza una lectura suficientemente rica para sentirse cerrada como rama.", "La serenidad del jardín ya tiene capítulo.", "sticker_pack"),
  condition("complete_fire_branch", "ramas_y_capitulos", "Se completa una rama de fuego", "Se activa cuando la familia fuego alcanza una lectura suficientemente rica para sentirse cerrada como rama.", "La intensidad del jardín ya tiene capítulo.", "background"),
  condition("complete_earth_branch", "ramas_y_capitulos", "Se completa una rama de tierra", "Se activa cuando la familia tierra alcanza una lectura suficientemente rica para sentirse cerrada como rama.", "La materia del jardín ya tiene capítulo.", "frame"),
  condition("complete_air_branch", "ramas_y_capitulos", "Se completa una rama de aire", "Se activa cuando la familia aire alcanza una lectura suficientemente rica para sentirse cerrada como rama.", "La ligereza del jardín ya tiene capítulo.", "canvas_detail"),
  condition("complete_light_branch", "ramas_y_capitulos", "Se completa una rama de luz", "Se activa cuando la familia luz alcanza una lectura suficientemente rica para sentirse cerrada como rama.", "La celebración del jardín ya tiene capítulo.", "template"),
  condition("complete_moon_branch", "ramas_y_capitulos", "Se completa una rama de luna", "Se activa cuando la familia luna alcanza una lectura suficientemente rica para sentirse cerrada como rama.", "La intimidad del jardín ya tiene capítulo.", "message"),
  condition("complete_star_branch", "ramas_y_capitulos", "Se completa una rama de estrella", "Se activa cuando la familia estrella alcanza una lectura suficientemente rica para sentirse cerrada como rama.", "Los suenos del jardín ya tienen capítulo.", "gift"),
  condition("year_chapter_opens_from_memory", "ramas_y_capitulos", "Una memoria abre capítulo anual", "Se activa cuando una página funciona como puerta clara del relato de un año.", "Year encuentra inicio natural.", "template"),
  condition("memory_promoted_to_year_highlight", "ramas_y_capitulos", "Una memoria sube a destacado anual", "Se activa cuando una página asciende por peso propio a la selección del año.", "El relato anual la reconoce.", "frame"),
  condition("forest_layer_opens", "ramas_y_capitulos", "El bosque abre una nueva capa", "Se activa cuando un conjunto de hitos o memorias justifica una nueva lectura en forest.", "El recorrido deja ver otra profundidad.", "background"),

  condition("future_promise_recorded", "futuro_y_promesas", "Primera promesa al futuro", "Se activa cuando la pareja deja una promesa clara orientada al tiempo por venir.", "El jardín aprende a mirar delante.", "message"),
  condition("future_promise_fulfilled", "futuro_y_promesas", "Promesa cumplida", "Se activa cuando una promesa previa encuentra su realizacion y queda contada.", "La historia demuestra que puede sostenerse.", "gift"),
  condition("time_capsule_created", "futuro_y_promesas", "Capsula del tiempo creada", "Se activa cuando una capsula del tiempo entra en el sistema con sentido propio.", "El futuro recibe una llave.", "template"),
  condition("time_capsule_opened", "futuro_y_promesas", "Capsula del tiempo abierta", "Se activa cuando una capsula llega a su momento y se abre como evento.", "El tiempo devuelve algo sembrado.", "message"),
  condition("message_to_future_self", "futuro_y_promesas", "Mensaje a vuestro yo futuro", "Se activa cuando una memoria se formula claramente para ser leida más adelante.", "La página cruza el tiempo.", "canvas_detail"),
  condition("memory_changes_with_time", "futuro_y_promesas", "Una memoria cambia al releerla", "Se activa cuando el paso del tiempo altera de manera clara el sentido de una memoria.", "El jardín acepta la metamorfosis.", "frame"),
  condition("promise_anniversary_returns", "futuro_y_promesas", "Vuelve el aniversario de una promesa", "Se activa cuando una promesa ya sembrada regresa como fecha con peso propio.", "Tiempo y palabra se vuelven una cosa.", "gift"),
  condition("real_tree_ritual", "futuro_y_promesas", "Ritual de plantar un árbol real", "Se activa cuando el año culmina en el gesto físico y simbólico de plantar un árbol.", "Lo digital toca la tierra de verdad.", "template"),
  condition("end_of_cycle_closure", "futuro_y_promesas", "Cierre de un ciclo largo", "Se activa cuando una etapa grande encuentra su despedida consciente.", "El jardín sabe cerrar sin romperse.", "background"),
  condition("new_cycle_opening", "futuro_y_promesas", "Apertura de un ciclo nuevo", "Se activa cuando una nueva etapa se nombra y se inaugura con memoria propia.", "La historia se renueva con voluntad.", "sticker_pack"),
];

export const PROGRESSION_CONDITION_CATEGORY_LABELS: Record<
  ProgressionConditionCategory,
  string
> = {
  primeras_veces: "Primeras veces",
  rituales_compartidos: "Rituales compartidos",
  profundidad_memoria: "Profundidad de memoria",
  lugares_significativos: "Lugares significativos",
  estaciones_y_tiempo: "Estaciones y tiempo",
  cuidado_compartido: "Cuidado compartido",
  revisitas_y_continuidad: "Revisitas y continuidad",
  celebraciones: "Celebraciones",
  ramas_y_capitulos: "Ramas y capítulos",
  futuro_y_promesas: "Futuro y promesas",
};
