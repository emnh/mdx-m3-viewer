/**
 * @memberof GL
 * @class A WebGL sphere.
 * @name Sphere
 * @param {number} x X coordinate.
 * @param {number} y Y coordinate.
 * @param {number} z Z coordinate.
 * @param {number} latitudeBands Latitude bands.
 * @param {number} longitudeBands Longitude bands.
 * @param {number} radius The sphere radius.
 * @property {WebGLBuffer} vertexBuffer
 * @property {WebGLBuffer} indexBuffer
 * @property {Float32Array} vertexArray
 * @property {Float32Array} indexArray
 */
function Sphere(ctx, x, y, z, latitudeBands, longitudeBands, radius) {
    var vertexData = [];
    var indexData = [];
    var latNumber;
    var longNumber;

    for (latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (longNumber = 0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var vx = cosPhi * sinTheta;
            var vy = cosTheta;
            var vz = sinPhi * sinTheta;
            var s = 1 - (longNumber / longitudeBands);
            var t = latNumber / latitudeBands;

            // Position
            vertexData.push(x + vx * radius);
            vertexData.push(y + vy * radius);
            vertexData.push(z + vz * radius);
            // Normal
            //vertexData.push(x);
            //vertexData.push(y);
            //vertexData.push(z);
            // Texture coordinate
            vertexData.push(s);
            vertexData.push(t);
        }
    }

    for (latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for (longNumber = 0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;

            // First trianctxe
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);
            // Second trianctxe
            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    this.ctx = ctx;
    
    this.vertexArray = new Float32Array(vertexData);
    this.indexArray = new Uint16Array(indexData);

    this.vertexBuffer = ctx.createBuffer();
    this.indexBuffer = ctx.createBuffer();

    ctx.bindBuffer(ctx.ARRAY_BUFFER, this.vertexBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, this.vertexArray, ctx.STATIC_DRAW);

    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, this.indexArray, ctx.STATIC_DRAW);
}

Sphere.prototype = {
  /**
   * Renders a sphere with the given shader.
   *
   * @memberof GL.Sphere
   * @instance
   * @param {GL.Shader} shader
   */
    render: function (shader) {
        var ctx = this.ctx;
        
        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.vertexBuffer);

        ctx.vertexAttribPointer(shader.variables.a_position, 3, ctx.FLOAT, false, 20, 0);
        ctx.vertexAttribPointer(shader.variables.a_uv, 2, ctx.FLOAT, false, 20, 12);

        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        ctx.drawElements(ctx.TRIANGLES, this.indexArray.length, ctx.UNSIGNED_SHORT, 0);
    },
  
  /**
   * Renders a sphere's lines with the given shader.
   *
   * @memberof GL.Sphere
   * @instance
   * @param {Shader} shader
   */
    renderLines: function (shader) {
        var ctx = this.ctx;
        
        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.vertexBuffer);

        ctx.vertexAttribPointer(shader.variables.a_position, 3, ctx.FLOAT, false, 20, 0);

        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        ctx.drawElements(ctx.LINES, this.indexArray.length, ctx.UNSIGNED_SHORT, 0);
    }
};
