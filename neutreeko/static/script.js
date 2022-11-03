const BLACK = 1,
  WHITE = -1;
const AVAILABLE = 1,
  UNAVAILABLE = 0;
const START = 0,
  FINISH = 1;
let data = [];
let options = [];
let selectedDisk = [];
let turn = BLACK;
let isFinished = false; //終了したかどうか

let ai_turn;

const board = document.getElementById("board");
const whichIsHuman = document.getElementById("which-is-human");
const turnPart = document.getElementById("turn-part");

const modal = document.getElementById("modal");

const startDialog = document.getElementById("start-dialog");
const startButton = document.getElementById("start-button");

const finishDialog = document.getElementById("finish-dialog");
const result = document.getElementById("result");
const restartButton = document.getElementById("restart-button");

let cells = 5;

function init() {
  // AIが先手か否か決定
  if (Math.random() > 0.5) {
    ai_turn = WHITE;
    whichIsHuman.textContent = "あなたは黒です";
  } else {
    ai_turn = BLACK;
    whichIsHuman.textContent = "あなたは白です";
  }
  board.innerHTML = "";
  for (let i = 0; i < cells; i++) {
    const tr = document.createElement("tr");
    data[i] = Array(cells).fill(0);
    options[i] = Array(cells).fill(UNAVAILABLE);
    for (let j = 0; j < cells; j++) {
      const td = document.createElement("td");
      const disk = document.createElement("div");
      tr.appendChild(td);
      td.appendChild(disk);
      td.className = "cell";
      disk.className = "disk";

      td.onclick = tdClicked;
    }
    board.appendChild(tr);
  }
  addDisk(1, 0, WHITE);
  addDisk(3, 0, WHITE);
  addDisk(2, 1, BLACK);

  addDisk(2, 3, WHITE);
  addDisk(1, 4, BLACK);
  addDisk(3, 4, BLACK);

  turn == BLACK
    ? (turnPart.textContent = "黒の番です")
    : (turnPart.textContent = "白の番です");
  isFinished = false;
  render();
  openModal(START);
  if (ai_turn == BLACK) {
    ai_action();
  }
}

init();

// 描画
function render() {
  for (let x = 0; x < cells; x++) {
    for (let y = 0; y < cells; y++) {
      if (options[y][x] == UNAVAILABLE) {
        board.rows[y].cells[x].classList.remove("options");
        board.rows[y].cells[x].classList.add("green");
        if (data[y][x] == BLACK) {
          board.rows[y].cells[x].firstChild.classList.remove("white");
          board.rows[y].cells[x].firstChild.classList.add("black");
        } else if (data[y][x] == WHITE) {
          board.rows[y].cells[x].firstChild.classList.remove("black");
          board.rows[y].cells[x].firstChild.classList.add("white");
        } else {
          board.rows[y].cells[x].firstChild.classList.remove("white");
          board.rows[y].cells[x].firstChild.classList.remove("black");
        }
      } else {
        board.rows[y].cells[x].classList.remove("green");
        board.rows[y].cells[x].classList.add("options");
      }
      if (
        JSON.stringify([selectedDisk[0], selectedDisk[1]]) !=
        JSON.stringify([x, y])
      ) {
        board.rows[y].cells[x].firstChild.classList.remove("selected");
      } else {
        board.rows[y].cells[x].firstChild.classList.add("selected");
      }
    }
  }
}

// (x, y) にcolor色のコマを追加
function addDisk(x, y, color) {
  data[y][x] = color;
}

// (x, y)からコマを削除
function removeDisk(x, y) {
  data[y][x] = 0;
}

// コマを目的地に移動
function transfer(destination) {
  removeDisk(selectedDisk[0], selectedDisk[1]);
  addDisk(destination[0], destination[1], selectedDisk[2]);
  cancelSelection();
}

// ユーザーがクリックした際の動作
function tdClicked() {
  if (turn == ai_turn || isFinished) return;
  const y = this.parentNode.rowIndex;
  const x = this.cellIndex;

  if (options[y][x] == 1) {
    //選択候補をクリックしたとき
    transfer([x, y]);
    render();
    judge();
    if (isFinished) {
      openModal(FINISH);
    } else {
      turn *= -1;
      turn == BLACK
        ? (turnPart.textContent = "黒の番です")
        : (turnPart.textContent = "白の番です");
      ai_action();
    }
  } else if (data[y][x] == turn) {
    // 自分のターンで操作可能なコマのあるマスをクリックしたとき
    cancelSelection();
    selectedDisk = [x, y, data[y][x]];
    findOptions(x, y);
    render();
  } else {
    // 選択候補でなく、操作可能なコマもないマスをクリックしたとき
    cancelSelection();
    render();
  }
}

// AIの動作
function ai_action() {
  console.log("ai_action");
  data_to_py = [data, turn];
  var json = JSON.stringify(data_to_py);
  $.ajax({
    type: "POST",
    url: "/predict/",
    data: json,
    contentType: "application/json",
  })
    .done(function (action) {
      var fromY = Math.floor(action[0] / 5);
      var fromX = action[0] % 5;
      var toY = Math.floor(action[1] / 5);
      var toX = action[1] % 5;
      removeDisk(fromX, fromY);
      addDisk(toX, toY, turn);
      render();
      judge();
      if (isFinished) {
        openModal(FINISH);
      } else {
        turn *= -1;
        turn == BLACK
          ? (turnPart.textContent = "黒の番です")
          : (turnPart.textContent = "白の番です");
        // ユーザの操作（クリック）を待つ
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.log("jqXHR          : " + jqXHR.status); // HTTPステータスが取得
      console.log("textStatus     : " + textStatus); // タイムアウト、パースエラー
      console.log("errorThrown    : " + errorThrown.message); // 例外情報
      alert("ajax error");
    });
}

// 移動先候補の状態・選択されたコマの状態を解除
function cancelSelection() {
  for (let i = 0; i < cells; i++) {
    options[i] = Array(cells).fill(0);
  }
  selectedDisk = [];
}

// (x, y)から到達可能な移動先を全て見つける
function findOptions(x, y) {
  for (let i of [-1, 0, 1]) {
    for (let j of [-1, 0, 1]) {
      const result = findOption(x, y, i, j);
      if (JSON.stringify(result) != JSON.stringify([x, y])) {
        // 開始地点と選択肢が異なる座標の場合、移動が可能な選択肢として追加
        options[result[1]][result[0]] = AVAILABLE;
      }
    }
  }
}

// (x0, y0)からある一方向(dx, dy)についての到達可能な移動先を一つ見つける
// 到達可能な移動先がない場合、元の場所(x0, y0)の座標を返す
function findOption(x0, y0, dx, dy) {
  if (dx == 0 && dy == 0) {
    // dx=0, dy=0のとき、移動方向が定義できないため移動先の選択肢はなし
    return [x0, y0];
  }
  let x = x0;
  let y = y0;
  while (true) {
    if (!isReachable(x + dx, y + dy)) {
      // 到達不可になる一つ前の段階の座標を返す
      return [x, y];
    } else {
      x += dx;
      y += dy;
    }
  }
}

// (x, y)が空いていてかつ範囲内にあるマスかを判断
function isReachable(x, y) {
  if (y >= cells || x >= cells || y <= -1 || x <= -1) {
    // 盤の範囲外の場合、到達不可
    return false;
  } else if (data[y][x] != 0) {
    // すでにコマがある場合、到達不可
    return false;
  } else {
    // それ以外の場合、到達可能
    return true;
  }
}

// 勝敗を判断
function judge() {
  const blacks = document.querySelectorAll(".black");
  const whites = document.querySelectorAll(".white");

  if (isBingo(blacks)) {
    winner = BLACK;
    isFinished = true;
    return;
  } else if (isBingo(whites)) {
    winner = WHITE;
    isFinished = true;
    return;
  }
  isFinished = false;
  return;

  // 縦 or 横 or 斜め に3つそろっているところがあるか判断
  function isBingo(disks) {
    let xResult = [];
    let yResult = [];
    for (let disk of disks) {
      xResult.push(disk.parentNode.cellIndex);
      yResult.push(disk.parentNode.parentNode.rowIndex);
    }

    if (xResult[0] == xResult[1] && xResult[0] == xResult[2]) {
      if (
        Math.abs(yResult[2] - yResult[1]) == 1 &&
        Math.abs(yResult[1] - yResult[0]) == 1
      ) {
        return true;
      } else {
        return false;
      }
    } else if (yResult[0] == yResult[1] && yResult[0] == yResult[2]) {
      if (
        Math.abs(xResult[2] - xResult[1]) == 1 &&
        Math.abs(xResult[1] - xResult[0]) == 1
      ) {
        return true;
      } else {
        return false;
      }
    } else if (xResult[2] - xResult[1] != 0 && xResult[1] - xResult[0] != 0) {
      if (
        (yResult[2] - yResult[1]) / (xResult[2] - xResult[1]) ==
        (yResult[1] - yResult[0]) / (xResult[1] - xResult[0])
      ) {
        if (
          Math.abs(xResult[2] - xResult[1]) == 1 &&
          Math.abs(xResult[1] - xResult[0]) == 1 &&
          Math.abs(yResult[2] - yResult[1]) == 1 &&
          Math.abs(yResult[1] - yResult[0]) == 1
        ) {
          return true;
        }
      }
    } else {
      return false;
    }
  }
}

// アニメーション
function openModal(dialogType) {
  if (dialogType == START) {
    startDialog.classList.remove("hide");
  } else {
    if (winner == BLACK) {
      result.textContent = "黒の勝ち!!";
    } else {
      result.textContent = "白の勝ち!!";
    }
    finishDialog.classList.remove("hide");
  }
  modal.classList.remove("hide");
  modal.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 500,
    fill: "forwards",
  });
}

function closeModal() {
  modal.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 500,
    fill: "forwards",
  });
  setTimeout(() => {
    modal.classList.add("hide");
    startDialog.classList.add("hide");
    finishDialog.classList.add("hide");
  }, 500);
}

startButton.onclick = () => {
  closeModal();
};

restartButton.onclick = () => {
  closeModal();
  setTimeout(() => {
    init();
  }, 500);
};
