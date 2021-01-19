var scene, camera, renderer, controls, stats;

var container

var lastFrameTime;
var deltaTime;

var xCubes, yCubes, zCubes;
var cubeSize;
var cubeSpacing;

var stickerMargin;
var stickerSpacing;

var defaultMat;
var stickerDefaultMat;

var cubes;

var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();

var selectedCube;

var materialBrush;

var stickerRotations = [
    [0, 0, 0],
    [0, 0, 1.57079],
    [0, 0, 3.14159],
    [0, 0, 4.71238],
    [0, 1.57079, 0],
    [0, 4.71238, 0]
];

var facingCube = [
    [+1, 0, 0],
    [0, +1, 0],
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
    [0, 0, +1],
];

var uvAxisOrder = [
    [0, 1, 2],
    [2, 0, 1],
    [0, 2, 1],
    [1, 0, 2],
    [2, 1, 0],
    [1, 2, 0],
];

var cubeCenter;
var pivots = [];

var skybox;
var loader;

function Start() {
    
    ////////////////////////////////////// Scene and renderer setup ////////////////////////////////////// 

    container = document.getElementById( "threejs_scene" );
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 90, container.clientWidth / container.clientHeight, 0.1, 1000 );
    
    renderer = new THREE.WebGLRenderer( {antialias: true} );
    renderer.setSize( container.clientWidth, container.clientHeight );
    renderer.setClearColor( 0xf0f0f0 );
    container.appendChild( renderer.domElement );

    //Camera settings
    camera.position.set(3,4,6);
    camera.lookAt( new THREE.Vector3(0,0,0));


    //Stats
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    controls = new THREE.OrbitControls( camera, container );
    controls.addEventListener( 'change', Render );

    xCubes = 3; yCubes = 3; zCubes = 3;
    cubeSize = 1;
    cubeSpacing = 0.05;
    stickerMargin = 0.05;
    stickerSpacing = 0.0001;

    ////////////////////////////////////// //////////////////////////////////////
    
    loader = new THREE.TextureLoader();

    SetSkybox("leaves");

    SetDefaultMat("Wood_StaggeredFloorPlanks");

    SetStickerMat("Portrait.jpg");

    window.addEventListener( 'mousemove', onMouseMove, false );
    window.addEventListener( 'click', onMouseClick, false );

    lastFrameTime = Date.now();

    materialBrush = new THREE.MeshBasicMaterial( {color: 0xff0000 } );

    CreateCube();

}

function ChangeResource(resourceName, resourceType) {
    switch (resourceType) {
        case 'cubesMat':
            SetDefaultMat(resourceName);
            break;
        case 'stickerMat':
            SetStickerMat(resourceName);
            break;
        case 'skybox':
            SetSkybox(resourceName);
            break;
    }
    ReloadCube();
}

function SetDefaultMat(matName) {

    var diffuseMap = loader.load( "http://localhost:8080/textures/" + matName + "_Diffuse.png" );
    var specularMap = loader.load( "http://localhost:8080/textures/" + matName + "_Specular.png" );
    var roughnessMap = loader.load( "http://localhost:8080/textures/" + matName + "_Roughness.png" );
    var normalMap = loader.load( "http://localhost:8080/textures/" + matName + "_Normal.png" );

    var uniforms = {
        specularMap: {value: specularMap},
        diffuseMap:	{value: diffuseMap},
        roughnessMap:	{value: roughnessMap},
        normalMap: {value: normalMap},
        normalScale: {value: new THREE.Vector2(1,1)},
        pointLightPosition:	{ value: [
            new THREE.Vector3(5, 5, 5),
            new THREE.Vector3(-5, -6, -9)
        ] },
        clight:	{ value: [
            new THREE.Vector3(3, 3, 3),
            new THREE.Vector3(2, 2, 2)
        ] },
        textureRepeat: { type: "v2", value: new THREE.Vector2(1,1) },
        envMap: { value: skybox }
    };

    vs = document.getElementById("vertex").textContent;
    fs = document.getElementById("fragment").textContent;

    materialExtensions = {
    shaderTextureLOD: true // set to use shader texture LOD
    };

    defaultMat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vs, fragmentShader: fs, extensions: materialExtensions});
    defaultMat.vertexTangents = true;

}

function SetSkybox(name) {

    const cubeLoader = new THREE.CubeTextureLoader();
    skybox = cubeLoader.load( [
    'http://localhost:8080/textures/cubemaps/' + name + '/posx.png',
    'http://localhost:8080/textures/cubemaps/' + name + '/negx.png',
    'http://localhost:8080/textures/cubemaps/' + name + '/posy.png',
    'http://localhost:8080/textures/cubemaps/' + name + '/negy.png',
    'http://localhost:8080/textures/cubemaps/' + name + '/posz.png',
    'http://localhost:8080/textures/cubemaps/' + name + '/negz.png'
    ]);

    scene.background = skybox;
    if (typeof defaultMat != 'undefined') defaultMat.uniforms.envMap.value = skybox;
    if (typeof defaultMat != 'undefined') stickerDefaultMat.uniforms.envMap.value = skybox;
}

function SetStickerMat(matName) {

    const tex = loader.load( 'http://localhost:8080/images/' + matName );

    var stickerUniforms = {
        cspec: {value: new THREE.Vector3(0.2, 0.2, 0.2)},
        diffuseMap:	{value: tex},
        roughness:	{value: 0.5},
        pointLightPosition:	{ value: [
            new THREE.Vector3(5, 5, 5),
            new THREE.Vector3(-5, -6, -9)
        ] },
        clight:	{ value: [
            new THREE.Vector3(3, 3, 3),
            new THREE.Vector3(2, 2, 2)
        ] },
        textureRepeat: { type: "v2", value: new THREE.Vector2(1,1) },
        envMap: { value: skybox }
    };

    svs = document.getElementById("stickerVertex").textContent;
    sfs = document.getElementById("stickerFragment").textContent;

    materialExtensions = {
    shaderTextureLOD: true // set to use shader texture LOD
    };

    stickerDefaultMat = new THREE.ShaderMaterial({ uniforms: stickerUniforms, vertexShader: svs, fragmentShader: sfs, extensions: materialExtensions});

}

function changeLightIntensity(value) {
    if (typeof defaultMat != 'undefined') defaultMat.uniforms.clight.value = [ new THREE.Vector3(value, value, value), new THREE.Vector3(value * 0.75, value * 0.75, value * 0.75)];
    if (typeof defaultMat != 'undefined') stickerDefaultMat.uniforms.clight.value = [ new THREE.Vector3(value, value, value), new THREE.Vector3(value * 0.75, value * 0.75, value * 0.75)];
    document.getElementById("lightIntensity").value = value;
    document.getElementById("lightIntensityBox").value = value;
}

function changeCubeParameter(value, parameter) {
    switch (parameter) {
        case 'xCubes':
            xCubes = value;
            document.getElementById("xCubes").value = value;
            document.getElementById("xCubesCount").value = value;
            break;
        case 'yCubes':
            yCubes = value;
            document.getElementById("yCubes").value = value;
            document.getElementById("yCubesCount").value = value;
            break;
        case 'zCubes':
            zCubes = value;
            document.getElementById("zCubes").value = value;
            document.getElementById("zCubesCount").value = value;
            break;
        case 'spacing':
            cubeSpacing = parseFloat(value);
            document.getElementById("spacing").value = value;
            document.getElementById("spacingBox").value = value;
            break;
        case 'cubesSize':
            cubeSize = parseFloat(value);
            document.getElementById("cubesSize").value = value;
            document.getElementById("cubesSizeBox").value = value;
            break;
        case 'stickerMargin':
            stickerMargin = parseFloat(value);
            document.getElementById("stickerMargin").value = value;
            document.getElementById("stickerMarginBox").value = value;
    }
    ReloadCube();
}

function onWindowResize(event) {
    var w = container.clientWidth;
    var h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect(w/h);
    camera.updateProjectionMatrix();
    controls.handleResize();
}

function CreateCube() {

    cubes = [];
    cubeCenter = new THREE.Group();
    scene.add(cubeCenter);
    cubeCenter.position.set((xCubes / 2.0) * (cubeSize + cubeSpacing), (yCubes / 2.0) * (cubeSize + cubeSpacing), (zCubes / 2.0) * (cubeSize + cubeSpacing));

    for(let i = 0; i < 6; i++) {
        var newPivot = new THREE.Object3D();
        //scene.add(newPivot);
        cubeCenter.add(newPivot);

        newPivot.position = new THREE.Vector3(cubeSize + (cubeSpacing));
        pivots.push(newPivot);
    }

    var x, y, z;
    for (x = 0; x < xCubes; x++) {
        var xArr = [];
        cubes[x] = xArr;
        for (y = 0; y < yCubes; y++) {
            var yArr = [];
            cubes[x][y] = yArr;
            for (z = 0; z < zCubes; z++) {

                var cubeGeo = new THREE.BoxBufferGeometry(cubeSize, cubeSize, cubeSize);
                var newCube = new THREE.Mesh( cubeGeo, defaultMat );

                THREE.BufferGeometryUtils.computeTangents(cubeGeo);

                newCube.position.set(((x + 0.5) * cubeSize) + (cubeSpacing * x), ((y + 0.5) * cubeSize) + (cubeSpacing * y), ((z + 0.5) * cubeSize) + (cubeSpacing * z));

                //scene.add( newCube );

                cubes[x][y][z] = newCube;

                cubeCenter.add(newCube);
                newCube.position.sub(cubeCenter.position);
            }
        }
    }
    
    AttachStickers();

    cubeCenter.position.set(0,0,0);

}

function DestroyCube() {

    scene.remove(cubeCenter);

}

function ReloadCube() {

    DestroyCube();
    CreateCube();

}

function AttachStickers() {

    var xl = 1.0 / xCubes;
    var yl = 1.0 / yCubes;
    var zl = 1.0 / zCubes;

    var x, y, z;
    for (x = 0; x < xCubes; x++) {
        for (y = 0; y < yCubes; y++) {
            for (z = 0; z < zCubes; z++) {

                var currentCube = cubes[x][y][z];
                
                for (let i = 0; i < 6; i++) {

                    //Very convoluted way to check if the current face is pointed outside the cube (to not place stickers in-between cubes)
                    if ((typeof cubes[x + facingCube[i][0]] === 'undefined') || (typeof cubes[x + facingCube[i][0]][y + facingCube[i][1]] === 'undefined') || (typeof cubes[x + facingCube[i][0]][y + facingCube[i][1]][z + facingCube[i][2]] === 'undefined') ) {

                        var quadGeo = new THREE.Geometry();

                        var cubeRadius = cubeSize/2.0;

                        var side = cubeRadius - stickerMargin;
                        var radius = cubeRadius + stickerSpacing;

                        var vertexPos = [
                            [
                                [radius, -side, -side],
                                [radius, side, -side],
                                [radius, side, side],
                                [radius, -side, side],
                            ],
                            [
                                [-side, radius, -side],
                                [-side, radius, side],
                                [side, radius, side],
                                [side, radius, -side],
                            ],
                            [
                                [-radius, -side, -side],
                                [-radius, -side, side],
                                [-radius, side, side],
                                [-radius, side, -side],
                            ],
                            [
                                [-side, -radius, -side],
                                [side, -radius, -side],
                                [side, -radius, side],
                                [-side, -radius, side],
                            ],
                            [
                                [-side, -side, -radius],
                                [-side, side, -radius],
                                [side, side, -radius],
                                [side, -side, -radius],
                            ],
                            [
                                [-side, -side, radius],
                                [side, -side, radius],
                                [side, side, radius],
                                [-side, side, radius],
                            ],
                        ];

                        quadGeo.vertices.push(
                            new THREE.Vector3(vertexPos[i][0][0], vertexPos[i][0][1], vertexPos[i][0][2]),
                            new THREE.Vector3(vertexPos[i][1][0], vertexPos[i][1][1], vertexPos[i][1][2]),
                            new THREE.Vector3(vertexPos[i][2][0], vertexPos[i][2][1], vertexPos[i][2][2]),
                            new THREE.Vector3(vertexPos[i][3][0], vertexPos[i][3][1], vertexPos[i][3][2])
                        )

                        quadGeo.faces.push(
                            new THREE.Face3(0, 1, 2),
                            new THREE.Face3(0, 2, 3)
                        )

                        var au, bu, cu, du;
                        var av, bv, cv, dv;

                        if (uvAxisOrder[i][0] == 1) {
                            au = xl * x;
                            bu = xl * (x+1);
                            cu = xl * (x+1);
                            du = xl * x;
                        } else if (uvAxisOrder[i][1] == 1) {
                            au = yl * y;
                            bu = yl * (y+1);
                            cu = yl * (y+1);
                            du = yl * y;
                        } else if (uvAxisOrder[i][2] == 1) {
                            au = zl * z;
                            bu = zl * (z+1);
                            cu = zl * (z+1);
                            du = zl * z;
                        }

                        if (uvAxisOrder[i][0] == 2) {
                            av = xl * x;
                            bv = xl * x;
                            cv = xl * (x+1);
                            dv = xl * (x+1);
                        } else if (uvAxisOrder[i][1] == 2) {
                            av = yl * y;
                            bv = yl * y;
                            cv = yl * (y+1);
                            dv = yl * (y+1);
                        } else if (uvAxisOrder[i][2] == 2) {
                            av = zl * z;
                            bv = zl * z;
                            cv = zl * (z+1);
                            dv = zl * (z+1);
                        }

                        quadGeo.faceVertexUvs[0] = [];

                        /*
                        quadGeo.faceVertexUvs[0].push(
                            new THREE.Vector2(au, av),
                            new THREE.Vector2(bu, bv),
                            new THREE.Vector2(cu, cv),
                            new THREE.Vector2(du, dv),
                        )
                        */

                        quadGeo.faceVertexUvs[0].push(
                            [
                                new THREE.Vector2(au, av),
                                new THREE.Vector2(bu, bv),
                                new THREE.Vector2(cu, cv),
                            ],
                            [
                                new THREE.Vector2(au, av),
                                new THREE.Vector2(cu, cv),
                                new THREE.Vector2(du, dv),
                            ]
                        )

                        quadGeo.uvsNeedUpdate = true;
                        quadGeo.computeVertexNormals();

                        var sticker = new THREE.Mesh(quadGeo, stickerDefaultMat);

                        //scene.add(sticker);

                        currentCube.add(sticker);
                        sticker.position.set(0,0,0);


                    }

                }

            }
        }
    }

}

function onMouseClick() {

    if (typeof scene != "undefined" && false) {

        raycaster.setFromCamera(mouse, camera);
        var intersects = raycaster.intersectObjects( scene.children, true );

        if (intersects.length > 0) {
            selectedCube = intersects[0];

            selectedCube.object.material = materialBrush;

            //selectedCube.object.position.set(0, 0, 0);
        }


    }
}

function onMouseMove() {
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function Update() {

    deltaTime = Date.now() - lastFrameTime;
    lastFrameTime = Date.now();
    
    //cubeCenter.rotateY(0.001);

    requestAnimationFrame( Update );
    stats.update();
    controls.update();
    Render();

}

function Render() {
    
    renderer.render(scene, camera);
}

Start();
Update();