const placar = { a: 0, b: 0 };
const pontosA = document.getElementById('pontos-a');
const pontosB = document.getElementById('pontos-b');

function atualizarPlacar() {
  pontosA.textContent = placar.a;
  pontosB.textContent = placar.b;
}

document.getElementById('mais-a').addEventListener('click', () => {
  placar.a += 1;
  atualizarPlacar();
});

document.getElementById('mais-b').addEventListener('click', () => {
  placar.b += 1;
  atualizarPlacar();
});

document.getElementById('zerar').addEventListener('click', () => {
  placar.a = 0;
  placar.b = 0;
  atualizarPlacar();
});
