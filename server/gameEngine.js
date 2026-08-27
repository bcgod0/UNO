// UNO Game Engine & Logic

const COLORS = ['red', 'blue', 'green', 'yellow'];

/**
 * Creates a standard 108-card UNO deck.
 */
export function createDeck() {
  const deck = [];
  let idCounter = 1;

  COLORS.forEach((color) => {
    // 1x Zero card per color
    deck.push({
      id: `${color}_0_${idCounter++}`,
      color,
      type: 'number',
      value: '0',
    });

    // 2x 1-9 per color
    for (let i = 1; i <= 9; i++) {
      deck.push({ id: `${color}_${i}_a_${idCounter++}`, color, type: 'number', value: String(i) });
      deck.push({ id: `${color}_${i}_b_${idCounter++}`, color, type: 'number', value: String(i) });
    }

    // 2x Skip per color
    deck.push({ id: `${color}_skip_a_${idCounter++}`, color, type: 'skip', value: 'SKIP' });
    deck.push({ id: `${color}_skip_b_${idCounter++}`, color, type: 'skip', value: 'SKIP' });

    // 2x Reverse per color
    deck.push({ id: `${color}_rev_a_${idCounter++}`, color, type: 'reverse', value: 'REVERSE' });
    deck.push({ id: `${color}_rev_b_${idCounter++}`, color, type: 'reverse', value: 'REVERSE' });

    // 2x Draw Two per color
    deck.push({ id: `${color}_draw2_a_${idCounter++}`, color, type: 'draw2', value: '+2' });
    deck.push({ id: `${color}_draw2_b_${idCounter++}`, color, type: 'draw2', value: '+2' });
  });

  // 4x Wild
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild_${i}_${idCounter++}`, color: 'wild', type: 'wild', value: 'WILD' });
  }

  // 4x Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild4_${i}_${idCounter++}`, color: 'wild', type: 'wild4', value: '+4' });
  }

  return deck;
}

/**
 * Shuffles an array of cards in place (Fisher-Yates).
 */
export function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Draws N cards from deck. If deck runs out, reshuffles discard pile into deck.
 */
export function drawCards(deck, discardPile, count = 1) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discardPile.length <= 1) {
        // No cards left to draw
        break;
      }
      // Keep top card, shuffle rest into deck
      const topDiscard = discardPile.pop();
      deck.push(...shuffleDeck(discardPile));
      discardPile.length = 0;
      discardPile.push(topDiscard);
    }
    const card = deck.pop();
    if (card) drawn.push(card);
  }
  return drawn;
}

/**
 * Validates if a card can be legally played on top of current discard.
 * Rules for Stacking:
 * - +2 can be countered with +2 or +4
 * - +4 can ONLY be countered with another +4
 */
export function isValidMove(card, topDiscardCard, activeColor, pendingDrawCount = 0) {
  if (!card || !topDiscardCard) return false;

  // If there's an active stacked penalty (+2 or +4):
  if (pendingDrawCount > 0) {
    if (topDiscardCard.type === 'wild4') {
      // +4 card can ONLY be countered with another +4 card!
      return card.type === 'wild4';
    }
    if (topDiscardCard.type === 'draw2') {
      // +2 card can be countered with +2 or +4!
      return card.type === 'draw2' || card.type === 'wild4';
    }
  }

  // Wild cards can always be played
  if (card.color === 'wild') {
    return true;
  }

  // Match active color
  if (card.color === activeColor) {
    return true;
  }

  // Match type & value (e.g. number 5 on number 5, Skip on Skip, +2 on +2)
  if (card.type === 'number' && topDiscardCard.type === 'number' && card.value === topDiscardCard.value) {
    return true;
  }

  if (card.type !== 'number' && card.type === topDiscardCard.type) {
    return true;
  }

  return false;
}

/**
 * Advances the turn to the next player.
 */
export function advanceTurn(room, step = 1) {
  const numPlayers = room.players.length;
  if (numPlayers === 0) return;

  room.hasDrawnCard = false;
  room.drawnCardId = null;

  room.currentTurn = (room.currentTurn + (room.direction * step) + numPlayers * 1000) % numPlayers;
}

/**
 * Formats room state for public broadcast (masking opponents' hands for security).
 */
export function sanitizeRoomForPlayer(room, socketId) {
  const isHost = room.hostId === socketId;
  const sanitizedPlayers = room.players.map((p, idx) => {
    const isMe = p.id === socketId;
    return {
      id: p.id,
      name: p.name,
      cardCount: p.hand.length,
      hand: isMe ? p.hand : [], // Only send full hand to current player
      isHost: p.isHost,
      calledUno: p.calledUno,
      isCurrentTurn: idx === room.currentTurn
    };
  });

  return {
    code: room.code,
    maxPlayers: room.maxPlayers || 4,
    gameState: room.gameState,
    hostId: room.hostId,
    players: sanitizedPlayers,
    topDiscard: room.discardPile.length > 0 ? room.discardPile[room.discardPile.length - 1] : null,
    currentColor: room.currentColor,
    currentTurnIndex: room.currentTurn,
    currentTurnPlayerId: room.players[room.currentTurn]?.id,
    direction: room.direction, // 1 for clockwise, -1 for CCW
    deckCount: room.deck.length,
    turnDeadline: room.turnDeadline || null,
    winner: room.winner,
    logs: room.logs ? room.logs.slice(-10) : [],
    isMyTurn: room.players[room.currentTurn]?.id === socketId,
    pendingDrawCount: room.pendingDrawCount || 0,
    hasDrawnCard: room.hasDrawnCard || false,
    drawnCardId: room.drawnCardId || null,
  };
}
