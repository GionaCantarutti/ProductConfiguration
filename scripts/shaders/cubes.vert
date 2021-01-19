varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 uVv;

attribute vec4 tangent;
varying vec3 vTangent;
varying vec3 vBitangent;

void main() {
    vec4 vPos = modelViewMatrix * vec4( position, 1.0 );
    vPosition = vPos.xyz;
    vNormal = normalize(normalMatrix * normal);

    vec3 objectTangent = vec3( tangent.xyz );
    vec3 transformedTangent = normalMatrix * objectTangent;
    vTangent = normalize( transformedTangent );
    // w is 1 or -1 depending on the sign of det( M tangent )
    vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );

    uVv = uv;
    gl_Position = projectionMatrix * vPos;
}