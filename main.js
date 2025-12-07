// main.js

// === Three.jsの初期設定 ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true }); // 背景透過を有効に
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// カメラ位置を調整 (描画空間の中心)
camera.position.z = 5;

// === MediaPipe Handsの初期設定と開始 ===
const videoElement = document.getElementById('videoElement');

// MediaPipe Handsのインスタンスを作成
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469611/${file}`;
}});

// 検出設定
hands.setOptions({
    maxNumHands: 1, // 検出する手の最大数
    modelComplexity: 1, // モデルの複雑度 (0, 1, 2。高いほど精度UP/処理重くなる)
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// 手の検出結果を受け取るコールバック
hands.onResults(onResults);

// カメラユーティリティでカメラ映像を取得し、MediaPipeに送る
const cameraUtil = new Camera(videoElement, {
    onFrame: async () => {
        // カメラから取得したフレームをMediaPipeに処理させる
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

// カメラを開始
cameraUtil.start();

// === 3Dオブジェクトと描画ロジック ===

// 描画を表現するポイント (今回は人差し指の先端)
const pointerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const pointerMesh = new THREE.Mesh(pointerGeometry, pointerMaterial);
scene.add(pointerMesh);

// MediaPipeの検出結果を処理する関数
function onResults(results) {
    renderer.render(scene, camera); // シーンを再描画

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // 最初の手のランドマークを取得
        const landmarks = results.multiHandLandmarks[0];

        // 人差し指の先端（ランドマークインデックス: 8）の正規化座標を取得
        // 
        const indexFingerTip = landmarks[8];

        // --- 座標変換ロジック ---
        // MediaPipeの座標 (0.0～1.0) をThree.jsのワールド座標に変換
        // カメラ映像の左右反転を考慮し、X座標を反転させる (1.0 - x)
        // 描画空間をカメラ前面（Z=0.5）に配置するイメージ
        const x = (1.0 - indexFingerTip.x) * 10 - 5; // -5 to +5 の範囲にマッピング
        const y = indexFingerTip.y * 10 - 5;       // -5 to +5 の範囲にマッピング
        const z = -indexFingerTip.z * 10;          // 奥行きも利用可能だが、ここではシンプルに
        
        // ポインターの位置を更新
        pointerMesh.position.set(x, -y, 0.5); // Y座標は画面の上下と合わせるため反転させています

        // 次のステップ：ここで描画開始ジェスチャー判定を行い、Lineを描画する処理を加えます

    } else {
        // 手が検出されない場合はポインターを非表示にするなど
        // pointerMesh.position.set(999, 999, 999);
    }

    // Three.jsでアニメーションループを使う代わりに、MediaPipeの更新の度に再描画
}

// ウィンドウサイズ変更時のリサイズ処理
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// アニメーションループ (今回はMediaPipeのonFrameで描画を制御するので不要ですが、一般的な構成として残します)
// function animate() {
//     requestAnimationFrame(animate);
//     // renderer.render(scene, camera);
// }
// animate();