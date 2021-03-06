Mdx.ParticleEmitter = function (emitter, model, instance, context, customPaths) {
    var i, l;
    var keys = Object.keys(emitter);

    for (i = keys.length; i--;) {
        this[keys[i]] = emitter[keys[i]];
    }

    this.lastCreation = 0;

    var path = emitter.path.replace(/\\/g, "/").toLowerCase().replace(".mdl", ".mdx");

    this.spawnModel = context.loadInternalResource(customPaths(path));
    this.spawnModel.setSequence(0);

    var particles;

    // This is the maximum number of particles that are going to exist at the same time
    if (emitter.tracks.emissionRate) {
        var tracks = emitter.tracks.emissionRate;
        var biggest = 0;

        for (i = 0, l = tracks.length; i < l; i++) {
            var track = tracks[i];

            if (track.vector > biggest) {
                biggest = track.vector;
            }
        }
        // For a reason I can't understand, biggest*lifespan isn't enough for emission rate tracks, multiplying by 2 seems to be the lowest reasonable value that works
        particles = Math.round(biggest * Math.ceil(emitter.lifespan) * 2);
    } else {
        particles = Math.round(emitter.emissionRate * Math.ceil(emitter.lifespan));
    }

    this.particles = [];
    this.reusables = [];

    for (i = particles; i--;) {
        this.particles[i] = new Mdx.Particle();
        this.reusables.push(i);
    }

    this.node = instance.skeleton.nodes[emitter.node.index];
    this.sd = new Mdx.SDContainer(emitter.tracks, model);

    // To avoid heap alocations
    this.heapVelocity = vec3.create();
    this.heapMat = mat4.create();
    this.heapVel1 = vec3.create();
    this.heapVel3 = vec3.create();
};

Mdx.ParticleEmitter.prototype = {
    update: function (allowCreate, sequence, frame, counter, context) {
        var i, l;

        if (this.spawnModel) {
            this.spawnModel.update(context);
        }

        for (i = 0, l = this.particles.length; i < l; i++) {
            var particle = this.particles[i];

            if (particle.alive) {
                if (particle.health <= 0) {
                    particle.alive = false;

                    this.reusables.push(i);
                } else {
                    particle.update(this, sequence, frame, counter, context);
                }
            }
        }

        if (allowCreate && this.shouldRender(sequence, frame, counter)) {
            this.lastCreation += 1;

            var amount = this.getEmissionRate(sequence, frame, counter) * context.frameTimeS * this.lastCreation;

            if (amount >= 1) {
                this.lastCreation = 0;

                for (i = 0; i < amount; i++) {
                    if (this.reusables.length > 0) {
                        this.particles[this.reusables.pop()].reset(this, sequence, frame, counter);
                    }
                }
            }
        }
    },

    render: function (context) {
        var gl = context.gl;
        var spawnModel = this.spawnModel;

        if (spawnModel) {
            for (var i = 0, l = this.particles.length; i < l; i++) {
                var particle = this.particles[i];

                if (particle.health > 0) {
                    var p = particle.position;

                    gl.pushMatrix();
                    gl.translate(p);
                    gl.rotate(particle.orientation, vec3.UNIT_Z);

                    spawnModel.setScaleVector(this.node.scale);
                    spawnModel.render(context);

                    gl.popMatrix();
                }
            }
        }
    },

    shouldRender: function (sequence, frame, counter) {
        return this.getVisibility(sequence, frame, counter) > 0.75;
    },

    getSpeed: function (sequence, frame, counter) {
        return this.sd.getKPES(sequence, frame, counter, this.speed);
    },

    getLatitude: function (sequence, frame, counter) {
        return this.sd.getKPLT(sequence, frame, counter, this.latitude);
    },

    getLongitude: function (sequence, frame, counter) {
        return this.sd.getKPLN(sequence, frame, counter, this.longitude);
    },

    getLifespan: function (sequence, frame, counter) {
        return this.sd.getKPEL(sequence, frame, counter, this.lifespan);
    },

    getGravity: function (sequence, frame, counter) {
        return this.sd.getKPEG(sequence, frame, counter, this.gravity);
    },

    getEmissionRate: function (sequence, frame, counter) {
        return this.sd.getKPEE(sequence, frame, counter, this.emissionRate);
    },

    getVisibility: function (sequence, frame, counter) {
        return this.sd.getKPEV(sequence, frame, counter, 1);
    }
};
