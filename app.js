let bankroll = 2500;
let currentBet = 0;
let perfectPairBet = 0;
let twentyOnePlusThreeBet = 0;
let betTarget = 'main'; // main, perfect, 21plus3

let deck = [], dealerHand = [], playerHand = [], gamePhase = 'bet';

const suits = ['♥','♦','♣','♠'];
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function createDeck() {
  deck = [];
  for (let i = 0; i < 6; i++) {
    for (let s of suits) for (let v of values) {
      const num = v==='A' ? 11 : (isNaN(parseInt(v)) ? 10 : parseInt(v));
      deck.push({val:v, suit:s, num});
    }
  }
  deck.sort(()=>Math.random()-0.5);
}

function cardValue(hand) {
  let total = 0, aces = 0;
  hand.forEach(c => { total += c.num; if(c.val==='A') aces++; });
  while (total > 21 && aces--) total -= 10;
  return total;
}

function renderHand(id, hand, hidden = false) {
  const container = document.getElementById(id);
  container.innerHTML = '';
  hand.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = `card ${['♥','♦'].includes(card.suit) ? 'red' : 'black'}`;
    div.innerHTML = `<div>${card.val}</div><div class="text-4xl text-center">${card.suit}</div>`;
    if (hidden && i === 1) div.innerHTML = `<div class="w-full h-full bg-zinc-900 rounded-xl"></div>`;
    container.appendChild(div);
  });
}

function updateTotals() {
  document.getElementById('dealer-total').textContent = gamePhase === 'playing' ? '?' : cardValue(dealerHand);
  document.getElementById('player-total').textContent = cardValue(playerHand);
}

function updateWagered() {
  const total = currentBet + perfectPairBet + twentyOnePlusThreeBet;
  document.getElementById('total-wagered').textContent = '$' + total;
}

function selectTarget(target) {
  betTarget = target;
  document.querySelectorAll('.bet-box').forEach(b => b.classList.remove('active'));
  document.getElementById('target-main').classList.toggle('bg-emerald-600', target === 'main');
  document.getElementById('target-perfect').classList.toggle('bg-emerald-600', target === 'perfect');
  document.getElementById('target-21plus3').classList.toggle('bg-emerald-600', target === '21plus3');
  if (target === 'perfect') document.getElementById('perfect-box').classList.add('active');
  if (target === '21plus3') document.getElementById('21plus3-box').classList.add('active');
}

function placeBet(amount) {
  if (amount === 999999) amount = bankroll;
  if (amount > bankroll) amount = bankroll;

  if (betTarget === 'main') currentBet = Math.min(amount + currentBet, bankroll);
  else if (betTarget === 'perfect') perfectPairBet = Math.min(amount + perfectPairBet, bankroll);
  else twentyOnePlusThreeBet = Math.min(amount + twentyOnePlusThreeBet, bankroll);

  document.getElementById('perfect-bet').textContent = '$' + perfectPairBet;
  document.getElementById('21plus3-bet').textContent = '$' + twentyOnePlusThreeBet;
  updateWagered();
  document.getElementById('deal-btn').disabled = currentBet < 5;
}

function showBankrollModal() {
  document.getElementById('modal-bankroll').value = bankroll;
  document.getElementById('bankroll-modal').classList.remove('hidden');
}

function saveBankroll() {
  bankroll = Math.max(100, parseInt(document.getElementById('modal-bankroll').value) || 2500);
  document.getElementById('bankroll-display').textContent = '$' + bankroll;
  document.getElementById('bankroll-modal').classList.add('hidden');
  localStorage.setItem('velvet_bankroll', bankroll);
}

function dealHand() {
  const totalSide = perfectPairBet + twentyOnePlusThreeBet;
  if (currentBet < 5) return;
  bankroll -= (currentBet + totalSide);
  document.getElementById('bankroll-display').textContent = '$' + bankroll;

  createDeck();
  dealerHand = [deck.pop(), deck.pop()];
  playerHand = [deck.pop(), deck.pop()];

  gamePhase = 'playing';
  document.getElementById('deal-btn').disabled = true;

  renderHand('dealer-hand', dealerHand, true);
  renderHand('player-hand', playerHand);
  updateTotals();

  if (cardValue(playerHand) === 21) endHand('blackjack');
}

function hit() {
  playerHand.push(deck.pop());
  renderHand('player-hand', playerHand);
  updateTotals();
  if (cardValue(playerHand) > 21) endHand('bust');
}

async function stand() {
  renderHand('dealer-hand', dealerHand); // reveal hole card
  while (cardValue(dealerHand) < 17) {
    await new Promise(r => setTimeout(r, 800));
    dealerHand.push(deck.pop());
    renderHand('dealer-hand', dealerHand);
    updateTotals();
  }
  endHand('normal');
}

function endHand(reason) {
  gamePhase = 'ended';
  const playerTotal = cardValue(playerHand);
  const dealerTotal = cardValue(dealerHand);

  let payout = 0;
  let message = '';

  // Main bet
  if (reason === 'blackjack') payout = currentBet * 2.5;
  else if (reason !== 'bust' && playerTotal <= 21 && (dealerTotal > 21 || playerTotal > dealerTotal)) payout = currentBet * 2;
  else if (playerTotal === dealerTotal) payout = currentBet;

  // Perfect Pairs side bet
  if (perfectPairBet > 0 && playerHand[0].val === playerHand[1].val) {
    payout += perfectPairBet * 6;
  }

  // 21+3 side bet (player 2 cards + dealer up card)
  if (twentyOnePlusThreeBet > 0) {
    const threeCards = [playerHand[0], playerHand[1], dealerHand[0]];
    const ranks = threeCards.map(c => c.val).sort();
    const suits = threeCards.map(c => c.suit);
    if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) payout += twentyOnePlusThreeBet * 30; // three of a kind
    else if (suits[0] === suits[1] && suits[1] === suits[2]) payout += twentyOnePlusThreeBet * 5; // flush
    else if (parseInt(ranks[0])+1 === parseInt(ranks[1]) && parseInt(ranks[1])+1 === parseInt(ranks[2])) payout += twentyOnePlusThreeBet * 10; // straight
  }

  bankroll += payout;
  document.getElementById('bankroll-display').textContent = '$' + Math.floor(bankroll);

  document.getElementById('result-text').innerHTML = `<span class="block text-6xl">${message || (payout > currentBet + perfectPairBet + twentyOnePlusThreeBet ? 'YOU WIN!' : 'DEALER WINS')}</span><span class="text-emerald-400 text-4xl">+$${payout}</span>`;
  document.getElementById('result-overlay').classList.remove('hidden');
}

function newHand() {
  document.getElementById('result-overlay').classList.add('hidden');
  currentBet = perfectPairBet = twentyOnePlusThreeBet = 0;
  document.getElementById('perfect-bet').textContent = '$0';
  document.getElementById('21plus3-bet').textContent = '$0';
  updateWagered();
  document.getElementById('dealer-hand').innerHTML = '';
  document.getElementById('player-hand').innerHTML = '';
  gamePhase = 'bet';
  document.getElementById('deal-btn').disabled = true;
}

// Load saved bankroll
if (localStorage.getItem('velvet_bankroll')) bankroll = parseInt(localStorage.getItem('velvet_bankroll'));
document.getElementById('bankroll-display').textContent = '$' + bankroll;

function init() {
  selectTarget('main');
  console.log('%cVelvet 21 v4 loaded – bankroll obvious + real side bets 🔥', 'color:#10b981; font-weight:bold');
}
window.onload = init;
