export interface TutorialStep {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
}

export const QUICK_START_CHECKLIST: string[] = [
  'Elige tu formacion y presiona Start Game.',
  'Haz clic en una pieza propia para ver casillas validas.',
  'Haz clic en una casilla valida para mover y enviar accion.',
  'Si quieres no mover, usa Pass Turn.',
  'Cuando captures piezas, podras soltarlas desde tu reserva.',
];

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'goal',
    title: 'Objetivo de la partida',
    subtitle: 'Ganas por puntaje o por eliminacion',
    bullets: [
      'Captura piezas para sumar puntos.',
      'Controlar el centro otorga puntos extra cada turno.',
      'Si pierdes tu rey quedas eliminado.',
    ],
  },
  {
    id: 'start',
    title: 'Inicio rapido',
    subtitle: 'Configura en menos de 30 segundos',
    bullets: QUICK_START_CHECKLIST,
  },
  {
    id: 'turn',
    title: 'Turnos simultaneos',
    subtitle: 'Todos juegan al mismo tiempo',
    bullets: [
      'El temporizador marca el limite del turno.',
      'La ronda se resuelve cuando todos envian accion o se acaba el tiempo.',
      'Si no envias accion recibes penalizacion de puntaje.',
    ],
  },
  {
    id: 'drops',
    title: 'Reserva y drops',
    subtitle: 'Usa piezas capturadas a tu favor',
    bullets: [
      'Una captura agrega la pieza a tu reserva.',
      'Para drop: selecciona pieza de reserva y luego una casilla libre.',
      'Solo puedes hacer una accion por turno: mover o drop.',
    ],
  },
  {
    id: 'tips',
    title: 'Consejos contra la IA',
    subtitle: 'Errores comunes que debes evitar',
    bullets: [
      'No expongas piezas de alto valor sin soporte.',
      'Prioriza control de centro en apertura.',
      'En endgame protege tu rey y fuerza intercambios favorables.',
    ],
  },
  {
    id: 'win',
    title: 'Condiciones de victoria',
    subtitle: 'Como termina la partida',
    bullets: [
      'La partida termina por maximo de rondas o ultimo rey en pie.',
      'Si hay empate de puntaje pueden existir ganadores compartidos.',
      'Revisa el panel de jugadores para seguir el marcador.',
    ],
  },
];
