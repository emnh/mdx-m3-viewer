Mdx.Geoset = function (geoset, index, ctx) {
    var i, l, j, k;
    var positions = geoset.vertices;
    var normals = geoset.normals;
    var textureCoordinateSets = geoset.textureCoordinateSets;
    var uvsetSize = textureCoordinateSets[0].length * 2;
    var vertices = positions.length / 3;
    var uvs = new Float32Array(textureCoordinateSets.length * uvsetSize);
    var boneIndices = new Uint8Array(vertices * 4);
    var boneNumbers = new Uint8Array(vertices);
    var faces = geoset.faces;
    var edges = new Uint16Array(faces.length * 2);
    var matrixGroups = [];
    var minX = 1E9, minY = 1E9, minZ = 1E9;
    var maxX = -1E9, maxY = -1E9, maxZ = -1E9;
    var x, y, z;
    
    this.index = index;
    this.materialId = geoset.materialId;
    
    for (i = 0, l = positions.length; i < l; i += 3) {
        x = positions[i];
        y = positions[i + 1];
        z = positions[i + 2];
        
        if (x > maxX) {
            maxX = x;
        }
        
        if (x < minX) {
            minX = x;
        }
        
        if (y > maxY) {
            maxY = y;
        }
        
        if (y < minY) {
            minY = y;
        }
        
        if (z > maxZ) {
            maxZ = z;
        }
        
        if (z < minZ) {
            minZ = z;
        }
    }
    
    for (i = 0, l = faces.length, k = 0; i < l; i += 3, k += 6) {
        edges[k + 0] = faces[i + 0];
        edges[k + 1] = faces[i + 1];
        edges[k + 2] = faces[i + 1];
        edges[k + 3] = faces[i + 2];
        edges[k + 4] = faces[i + 2];
        edges[k + 5] = faces[i + 0];
    }
  
    // Make one typed array for the texture coordinates, in case there are multiple ones
    for (i = 0, l = textureCoordinateSets.length; i < l; i++) {
        uvs.set(textureCoordinateSets[i], i * uvsetSize);
    }
  
    // Parse the bone indices
    for (i = 0, l = geoset.matrixGroups.length, k = 0; i < l; i++) {
        matrixGroups.push(geoset.matrixIndexes.subarray(k, k + geoset.matrixGroups[i]));
        k += geoset.matrixGroups[i];
    }
  
    for (i = 0, l = vertices, k = 0; i < l; i++) {
        var matrixGroup = matrixGroups[geoset.vertexGroups[i]];
        var count = 0;

        // 1 is added to every index for shader optimization.
        for (j = 0; j < 4; j++) {
            if (matrixGroup && j < matrixGroup.length) {
                boneIndices[k] = matrixGroup[j] + 1;
                count += 1;
            } else {
                boneIndices[k] = 0;
            }

            k += 1;
        }

        boneNumbers[i] = count;
    }
  
    var normalsOffset = positions.byteLength;
    var uvsOffset = normalsOffset + normals.byteLength;
    var boneIndicesOffset = uvsOffset + uvs.byteLength;
    var boneNumbersOffset = boneIndicesOffset + boneIndices.byteLength;
    var bufferSize = boneNumbersOffset + boneNumbers.byteLength;

    var arrayBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, arrayBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER,  bufferSize, ctx.STATIC_DRAW);
    ctx.bufferSubData(ctx.ARRAY_BUFFER, 0, positions);
    ctx.bufferSubData(ctx.ARRAY_BUFFER, normalsOffset, normals);
    ctx.bufferSubData(ctx.ARRAY_BUFFER, uvsOffset, uvs);
    ctx.bufferSubData(ctx.ARRAY_BUFFER, boneIndicesOffset, boneIndices);
    ctx.bufferSubData(ctx.ARRAY_BUFFER, boneNumbersOffset, boneNumbers);

    var elementBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, elementBuffer);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, faces, ctx.STATIC_DRAW);

    var edgeBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, edgeBuffer);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, edges, ctx.STATIC_DRAW);

    this.offsets = [0, normalsOffset, uvsOffset, boneIndicesOffset, boneNumbersOffset];
    this.uvsetSize = uvsetSize * 4;
    this.arrayBuffer = arrayBuffer;
    this.elementBuffer = elementBuffer;
    this.edgeBuffer = edgeBuffer;
    this.elements = faces.length;
    this.min = [minX, minY, minZ];
    this.max = [maxX, maxY, maxZ];
};

Mdx.Geoset.prototype = {
    bindCommon: function (shader, ctx) {
        var offsets = this.offsets;

        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.arrayBuffer);

        ctx.vertexAttribPointer(shader.variables.a_position, 3, ctx.FLOAT, false, 12, offsets[0]);
        ctx.vertexAttribPointer(shader.variables.a_bones, 4, ctx.UNSIGNED_BYTE, false, 4, offsets[3]);
        ctx.vertexAttribPointer(shader.variables.a_bone_number, 1, ctx.UNSIGNED_BYTE, false, 1, offsets[4]);
    },

    render: function (coordId, shader, polygonMode, ctx) {
        var offsets = this.offsets;

        this.bindCommon(shader, ctx);

        ctx.vertexAttribPointer(shader.variables.a_normal, 3, ctx.FLOAT, false, 12, offsets[1]);
        ctx.vertexAttribPointer(shader.variables.a_uv, 2, ctx.FLOAT, false, 8, offsets[2] + coordId * this.uvsetSize);
        
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
        ctx.drawElements(ctx.TRIANGLES, this.elements, ctx.UNSIGNED_SHORT, 0);
    },
    
    renderWireframe: function (shader, ctx) {
        this.bindCommon(shader, ctx);

        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, this.edgeBuffer);
        ctx.drawElements(ctx.LINES, this.elements * 2, ctx.UNSIGNED_SHORT, 0);
    },

    renderColor: function (shader, ctx) {
        this.bindCommon(shader, ctx);

        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
        ctx.drawElements(ctx.TRIANGLES, this.elements, ctx.UNSIGNED_SHORT, 0);
    },
    
    getPolygonCount: function () {
        return this.elements / 3;
    }
};
