#! /usr/bin/node
'use strict'

const readline = require('readline');

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}
// removes cursor
process.stdout.write("\x1B[?25l")
process.on('exit', () => {
    process.stdout.write("\x1B[?25h")
})
process.stdin.on('keypress', (...args) => {
    const [key, { name, ctrl }] = args;
    if (key === '\x03') {
        process.exit(0);
    }
    switch (name) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
            currentDirection = name;
            break;
        default:
            break;
    }
})

const red = (s) => `\u001b[31m${s}\u001b[37m`
const blue = (s) => `\u001b[34m${s}\u001b[37m`
const green = (s) => `\u001b[32m${s}\u001b[37m`
const cyan = (s) => `\u001b[36m${s}\u001b[37m`

// const TICK = 25;
const TICK = 50;
// const TICK = 100;
const size = [process.stdout.rows - 3, Math.floor((process.stdout.columns - 3) / 2)]

const renderBoard = (snake, food, x, y, newFood, gameOver) => {
    const square = '██';
    const board = [];
    for (let i = 0; i < x; i++) {
        const row = [];
        for (let j = 0; j < y; j++) {
            row.push('  ');
        }
        board.push(row);
    }
    snake.forEach(([sX, sY], i) => {
        // board[sX][sY] = i % 2 ? red() : blue();
        board[sX][sY] = newFood ? green(square) : square;
    })
    board[food[0]][food[1]] = square;

    const BLC = '▙';
    const BRC = '▟'
    const TLC = '▛'
    const TRC = '▜'
    const leadingColumns = board.map(row => ['▌', ...row, '▐']);
    const starRow = Array(board[0].length).fill('▀▀');
    const starRow2 = Array(board[0].length).fill('▄▄');
    const boardString = [
        TLC + starRow.join('') + TRC, 
        leadingColumns.map(b => b.join('')).join('\n'),
        BLC + starRow2.join('') + BRC
    ].join('\n');
    return gameOver ? red(boardString) : boardString;
};

// size: board dimensions
// len: initial snake length
const initSnake = (size, len = 4) => {
    const start = [
        Math.floor(Math.random() * Math.floor(size[0] / 2) + 2),
        Math.floor(Math.random() * Math.floor(size[1] / 2) + 2),
    ];
    let snake = [start];
    let rotations = 0;
    const dirs = ['right', 'up', 'left', 'down'];
    const rotate = (dir) => {
        const dirIndx = dirs.findIndex(d => d === dir);
        return dirs[(dirIndx + rotations) % 4]
    }
    const direction = directions('right', rotate);
    while (snake.length < len) {
        // get the next location of a move to mock food
        const [[mockFood]] = move(direction, snake, []);
        // move the snake into the mock food
        [snake] = move(direction, snake, mockFood);
        // peek at the next location of the snake
        const [[peek]] = move(direction, snake, []);
        // if the snake will be too close to the walls, adjust the rotation for the next body piece
        // rotations here are a little hacky, not a huge deal but if the snake ends up close to walls it could wrap around itself
        const currentDir = dirs[rotations % 4];
        if ((currentDir === 'down' && peek[0] > size[0] - 4) || (currentDir === 'up' && peek[0] < 4) || (currentDir === 'right' && peek[1] > size[1] - 4) || (currentDir === 'left' && peek[1] < 4)) {
            rotations++;
        }
    }
    return [snake, dirs[rotations % 4]];
}


const newFood = (snake, x, y) => {
    const toTry = [
        Math.floor(Math.random() * size[0]),
        Math.floor(Math.random() * size[1]),
    ];
    return snake.find(s => s.join() === toTry.join()) ? newFood(snake, x, y) : toTry;
}

const invert = (dir, nextHead, snake) => {
    if (nextHead.join() === snake.join()) {
        const dirs = ['up', 'right', 'down', 'left'];
        const dirIndx = dirs.findIndex(d => d === dir);
        return dirs[(dirIndx + 2) % 4]
    }
    return dir;
}

const move = (direction, snake, food) => direction(snake, food);

// adjust applies an adjustment function to the next move
// During gameplay if the snake moves back into the first point of its body, game will adjust and continue moving forward
const directions = (wasd, adjust) => {
    const dirs = {
        up: (x, y) => [x - 1, y],
        down: (x, y) => [x + 1, y],
        left: (x, y) => [x, y - 1],
        right: (x, y) => [x, y + 1],
    };
    return (snake, food) => {
        const nextHead = dirs[wasd](...snake[0]);
        const normalizedDirection = adjust(wasd, nextHead, snake[1]);
        const normalizedHead = dirs[normalizedDirection](...snake[0]);
        const ateFood = normalizedHead.join() === food.join();
        return [[
            normalizedHead,
            ...snake.slice(0, -1),
            ...(ateFood ? [snake[snake.length - 1]] : [])
        ], ateFood ? newFood(snake) : food];
    }
}

const isValid = ([head, ...snek], x, y) => {
    return head[0] > -1 && head[0] < x && head[1] > -1 && head[1] < y && !snek.find(s => s.join() === head.join())
}

// initial state
let [snake, currentDirection] = initSnake(size, 20);
let food = newFood(snake, ...size);

// meta state for color flashing
let newFoodFrames = 0;
let lastFood = food;
let lastSnake = snake;

// init debug
// console.log(snake, currentDirection);
// renderBoard(
//     snake,
//     food,
//     ...size,
// );
// process.exit(0);

const gameInterval = setInterval(() => {
    [snake, food] = move(directions(currentDirection, invert), snake, food);
    if (isValid(snake, ...size)) {
        if (food.join() !== lastFood.join()) {
            newFoodFrames = 4;
        }
        const boardString = renderBoard(
            snake,
            food,
            ...size,
            newFoodFrames-- > 0,
        );
        lastFood = food;
        lastSnake = snake;
        process.stdout.cursorTo(0, 0);
        console.log(boardString);
    } else {
        gameOver(lastSnake, food, ...size);
    }
}, TICK)

// flash the board on game over
async function gameOver(snake, food, x, y) {
    clearInterval(gameInterval);
    const wait = () => {
        return new Promise((res) => {
            setTimeout(() => res(), 400);
        })
    }
    for (let i = 0; i < 5; i++) {
        process.stdout.cursorTo(0, 0);
        console.log(
            renderBoard(
                snake,
                food,
                x,
                y,
                null,
                i % 2 === 0,
            )
        );
        await wait();
    }
    console.log('game over.');
    process.exit(0)
}
