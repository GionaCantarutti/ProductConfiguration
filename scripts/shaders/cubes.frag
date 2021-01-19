#define LIGHT_COUNT 2

const float PI = 3.14159;

varying vec3 vPosition;
varying vec2 uVv;
uniform vec3 pointLightPosition[LIGHT_COUNT]; // in world space
uniform vec3 clight[LIGHT_COUNT];
uniform sampler2D specularMap;
uniform sampler2D diffuseMap;
uniform sampler2D roughnessMap;
uniform vec2 textureRepeat;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
uniform sampler2D normalMap;
uniform vec2 normalScale;

uniform samplerCube envMap;

vec3 cdiff;
vec3 cspec;
float roughness;

float getSpecularMIPLevel( const in float roughness, const in int maxMIPLevel ) {

    float maxMIPLevelScalar = float( maxMIPLevel );

    float sigma = PI * roughness * roughness / ( 1.0 + roughness );
    float desiredMIPLevel = maxMIPLevelScalar + log2( sigma );

    // clamp to allowable LOD ranges.
    return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );

}

vec3 FSchlick(float vDoth, vec3 f0) {
    return f0 + (vec3(1.0)-f0)*pow(1.0 - vDoth,5.0);
}

float DGGX(float NoH, float alpha) {
    float alpha2 = alpha * alpha;
    float k = NoH*NoH * (alpha2 - 1.0) + 1.0;
    return alpha2 / (PI * k * k );
}

float G1(float nDotv, float alpha) {
    float alpha2 = alpha*alpha;
    return 2.0 * (nDotv / (nDotv + sqrt(alpha2 + (1.0-alpha2)*nDotv*nDotv )));
}

float GSmith(float nDotv, float nDotl, float alpha) {
    return G1(nDotl,alpha)*G1(nDotv,alpha);
}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
    return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

void main() {

    vec3 outRadiance = vec3(0, 0, 0);
    vec3 another = vec3(0, 0, 0);

    for (int i = 0; i < LIGHT_COUNT; i++) {

        vec4 lPosition = viewMatrix * vec4( pointLightPosition[i], 1.0 );
        vec3 l = normalize(lPosition.xyz - vPosition.xyz);

        vec3 normal = normalize( vNormal );
        vec3 tangent = normalize( vTangent );
        vec3 bitangent = normalize( vBitangent );
        mat3 vTBN = mat3( tangent, bitangent, normal );
        vec3 mapN = texture2D( normalMap, uVv ).xyz * 2.0 - 1.0;
        vec3 n = normalize( vTBN * mapN );

        vec3 v = normalize( -vPosition);
        vec3 h = normalize( v + l);
        // small quantity to prevent divisions by 0
        float nDotl = max(dot( n, l ),0.000001);
        float lDoth = max(dot( l, h ),0.000001);
        float nDoth = max(dot( n, h ),0.000001);
        float vDoth = max(dot( v, h ),0.000001);
        float nDotv = max(dot( n, v ),0.000001);

        cdiff = texture2D( diffuseMap, uVv*textureRepeat ).rgb;
        // texture in sRGB, linearize
        cdiff = pow( cdiff, vec3(2.2));
        cspec = texture2D( specularMap, uVv*textureRepeat ).rgb;
        // texture in sRGB, linearize
        cspec = pow( cspec, vec3(2.2));
        roughness = texture2D( roughnessMap, uVv*textureRepeat).r; // no need to linearize roughness map
        vec3 fresnel = FSchlick(vDoth, cspec);
        float alpha = roughness * roughness;
        vec3 BRDF = (vec3(1.0)-fresnel)*cdiff/PI + fresnel*GSmith(nDotv,nDotl, alpha)*DGGX(nDoth,alpha)/
            (4.0*nDotl*nDotv);

        vec3 vReflect = reflect(vPosition,n);
        float specularMIPLevel = getSpecularMIPLevel(alpha,8 );
        vec3 r = inverseTransformDirection( vReflect, viewMatrix );

        vec3 envLight = textureCubeLodEXT( envMap, vec3(-r.x, r.yz), specularMIPLevel ).rgb;
        envLight = pow( envLight, vec3(2.2));
            
        outRadiance = outRadiance + (envLight*PI* clight[i] * nDotl * BRDF );
        //another = n;

    }

    // gamma encode the final value
    gl_FragColor = vec4(pow( outRadiance, vec3(1.0/2.2)), 1.0);
    //gl_FragColor = vec4(another, 1.0);
}