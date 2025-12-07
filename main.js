// main.js の内容と contllor.js の内容を統合します

// 【削除】 import * as THREE from 'three';
// 【削除】 import { ARButton } from 'three/addons/webxr/ARButton.js';
// (これらはindex.htmlで読み込まれたため不要です)

// シーン、カメラ、レンダラーの初期化
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // WebXRを有効化
document.body.appendChild(renderer.domElement);

// 描画関連の変数 (contllor.jsと共有)
let isDrawing = false;
let currentLine; // 現在描画中の線
const drawMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
const geometryBuffer = new THREE.BufferGeometry(); // 頂点データを保持するジオメトリ
const positions = []; // 頂点座標の配列 (未使用ですが残しておきます)
let currentLinePoints = []; // 描画中の線分の頂点リスト

// --- contllor.js の内容の開始 ---
let controller;
let raycaster = new THREE.Raycaster();
let drawDistance = 2.0; // AR空間でカメラから2m先に描画する（簡易版）

// ARボタンの追加
// ARButtonはindex.htmlで読み込まれたため、グローバルに利用可能です
document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

renderer.xr.addEventListener('sessionstart', function () {
    // セッション開始時にコントローラーを設定
    // Three.jsがグローバルに利用可能なため、エラーは発生しません
    controller = renderer.xr.getController(0); // 最初のコントローラー/タップ
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    scene.add(controller);
});

renderer.xr.addEventListener('sessionend', function () {
    // セッション終了時にリスナーを解除
    if (controller) {
        controller.removeEventListener('selectstart', onSelectStart);
        controller.removeEventListener('selectend', onSelectEnd);
        scene.remove(controller);
    }
});

function onSelectStart() {
    isDrawing = true;
    currentLinePoints = []; // 新しい線の開始
    // 前の線が残っていたら削除
    if (currentLine) {
        scene.remove(currentLine);
        currentLine.geometry.dispose();
        currentLine = null;
    }
}

function onSelectEnd() {
    isDrawing = false;
    finalizeLine();
}

function finalizeLine() {
    if (currentLinePoints.length > 1) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(currentLinePoints);
        // linewidthはLineBasicMaterialでは無視されることが多いですが、そのまま残します
        currentLine = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xff00ff })); 
        scene.add(currentLine);
    }
}

// WebXRのメインループ (contllor.js内の処理をここに移動)
renderer.setAnimationLoop(function () {
    if (isDrawing) {
        // コントローラーがまだ存在しない場合のガード（セッション開始直後など）
        if (controller) {
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(controller.matrixWorld);
            
            const direction = new THREE.Vector3();
            controller.getWorldDirection(direction);

            const newPoint = position.add(direction.multiplyScalar(drawDistance));
            
            if (currentLinePoints.length === 0 || newPoint.distanceTo(currentLinePoints[currentLinePoints.length - 1]) > 0.02) {
                currentLinePoints.push(newPoint);
                updateCurrentLine();
            }
        }
    }
    
    renderer.render(scene, camera);
});

function updateCurrentLine() {
    // 描画中の線オブジェクトを更新または作成
    if (!currentLine) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(currentLinePoints);
        currentLine = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xff00ff }));
        scene.add(currentLine);
    } else {
        // 既存の線を更新
        currentLine.geometry.setFromPoints(currentLinePoints);
        currentLine.geometry.attributes.position.needsUpdate = true;
    }
}

// 画面サイズ変更の処理
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}