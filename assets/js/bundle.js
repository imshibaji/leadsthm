(function () {
    'use strict';

    const isDragging = {
        y: false,
    };
    function isDragActive() {
        return isDragging.y;
    }

    function resolveElements(elementOrSelector, scope, selectorCache) {
        var _a;
        if (elementOrSelector instanceof Element) {
            return [elementOrSelector];
        }
        else if (typeof elementOrSelector === "string") {
            let root = document;
            const elements = (_a = selectorCache === null || selectorCache === undefined ? undefined : selectorCache[elementOrSelector]) !== null && _a !== undefined ? _a : root.querySelectorAll(elementOrSelector);
            return elements ? Array.from(elements) : [];
        }
        return Array.from(elementOrSelector);
    }

    function setupGesture(elementOrSelector, options) {
        const elements = resolveElements(elementOrSelector);
        const gestureAbortController = new AbortController();
        const eventOptions = {
            passive: true,
            ...options,
            signal: gestureAbortController.signal,
        };
        const cancel = () => gestureAbortController.abort();
        return [elements, eventOptions, cancel];
    }

    function isValidHover(event) {
        return !(event.pointerType === "touch" || isDragActive());
    }
    /**
     * Create a hover gesture. hover() is different to .addEventListener("pointerenter")
     * in that it has an easier syntax, filters out polyfilled touch events, interoperates
     * with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
     *
     * @public
     */
    function hover(elementOrSelector, onHoverStart, options = {}) {
        const [elements, eventOptions, cancel] = setupGesture(elementOrSelector, options);
        const onPointerEnter = (enterEvent) => {
            if (!isValidHover(enterEvent))
                return;
            const { target } = enterEvent;
            const onHoverEnd = onHoverStart(target, enterEvent);
            if (typeof onHoverEnd !== "function" || !target)
                return;
            const onPointerLeave = (leaveEvent) => {
                if (!isValidHover(leaveEvent))
                    return;
                onHoverEnd(leaveEvent);
                target.removeEventListener("pointerleave", onPointerLeave);
            };
            target.addEventListener("pointerleave", onPointerLeave, eventOptions);
        };
        elements.forEach((element) => {
            element.addEventListener("pointerenter", onPointerEnter, eventOptions);
        });
        return cancel;
    }

    /**
     * Recursively traverse up the tree to check whether the provided child node
     * is the parent or a descendant of it.
     *
     * @param parent - Element to find
     * @param child - Element to test against parent
     */
    const isNodeOrChild = (parent, child) => {
        if (!child) {
            return false;
        }
        else if (parent === child) {
            return true;
        }
        else {
            return isNodeOrChild(parent, child.parentElement);
        }
    };

    const isPrimaryPointer = (event) => {
        if (event.pointerType === "mouse") {
            return typeof event.button !== "number" || event.button <= 0;
        }
        else {
            /**
             * isPrimary is true for all mice buttons, whereas every touch point
             * is regarded as its own input. So subsequent concurrent touch points
             * will be false.
             *
             * Specifically match against false here as incomplete versions of
             * PointerEvents in very old browser might have it set as undefined.
             */
            return event.isPrimary !== false;
        }
    };

    const focusableElements = new Set([
        "BUTTON",
        "INPUT",
        "SELECT",
        "TEXTAREA",
        "A",
    ]);
    function isElementKeyboardAccessible(element) {
        return (focusableElements.has(element.tagName) ||
            element.tabIndex !== -1);
    }

    const isPressing = new WeakSet();

    /**
     * Filter out events that are not "Enter" keys.
     */
    function filterEvents(callback) {
        return (event) => {
            if (event.key !== "Enter")
                return;
            callback(event);
        };
    }
    function firePointerEvent(target, type) {
        target.dispatchEvent(new PointerEvent("pointer" + type, { isPrimary: true, bubbles: true }));
    }
    const enableKeyboardPress = (focusEvent, eventOptions) => {
        const element = focusEvent.currentTarget;
        if (!element)
            return;
        const handleKeydown = filterEvents(() => {
            if (isPressing.has(element))
                return;
            firePointerEvent(element, "down");
            const handleKeyup = filterEvents(() => {
                firePointerEvent(element, "up");
            });
            const handleBlur = () => firePointerEvent(element, "cancel");
            element.addEventListener("keyup", handleKeyup, eventOptions);
            element.addEventListener("blur", handleBlur, eventOptions);
        });
        element.addEventListener("keydown", handleKeydown, eventOptions);
        /**
         * Add an event listener that fires on blur to remove the keydown events.
         */
        element.addEventListener("blur", () => element.removeEventListener("keydown", handleKeydown), eventOptions);
    };

    /**
     * Filter out events that are not primary pointer events, or are triggering
     * while a Motion gesture is active.
     */
    function isValidPressEvent(event) {
        return isPrimaryPointer(event) && true;
    }
    /**
     * Create a press gesture.
     *
     * Press is different to `"pointerdown"`, `"pointerup"` in that it
     * automatically filters out secondary pointer events like right
     * click and multitouch.
     *
     * It also adds accessibility support for keyboards, where
     * an element with a press gesture will receive focus and
     *  trigger on Enter `"keydown"` and `"keyup"` events.
     *
     * This is different to a browser's `"click"` event, which does
     * respond to keyboards but only for the `"click"` itself, rather
     * than the press start and end/cancel. The element also needs
     * to be focusable for this to work, whereas a press gesture will
     * make an element focusable by default.
     *
     * @public
     */
    function press(elementOrSelector, onPressStart, options = {}) {
        const [elements, eventOptions, cancelEvents] = setupGesture(elementOrSelector, options);
        const startPress = (startEvent) => {
            const element = startEvent.currentTarget;
            if (!isValidPressEvent(startEvent) || isPressing.has(element))
                return;
            isPressing.add(element);
            const onPressEnd = onPressStart(element, startEvent);
            const onPointerEnd = (endEvent, success) => {
                window.removeEventListener("pointerup", onPointerUp);
                window.removeEventListener("pointercancel", onPointerCancel);
                if (!isValidPressEvent(endEvent) || !isPressing.has(element)) {
                    return;
                }
                isPressing.delete(element);
                if (typeof onPressEnd === "function") {
                    onPressEnd(endEvent, { success });
                }
            };
            const onPointerUp = (upEvent) => {
                onPointerEnd(upEvent, options.useGlobalTarget ||
                    isNodeOrChild(element, upEvent.target));
            };
            const onPointerCancel = (cancelEvent) => {
                onPointerEnd(cancelEvent, false);
            };
            window.addEventListener("pointerup", onPointerUp, eventOptions);
            window.addEventListener("pointercancel", onPointerCancel, eventOptions);
        };
        elements.forEach((element) => {
            if (!isElementKeyboardAccessible(element) &&
                element.getAttribute("tabindex") === null) {
                element.tabIndex = 0;
            }
            const target = options.useGlobalTarget ? window : element;
            target.addEventListener("pointerdown", startPress, eventOptions);
            element.addEventListener("focus", (event) => enableKeyboardPress(event, eventOptions), eventOptions);
        });
        return cancelEvents;
    }

    /*#__NO_SIDE_EFFECTS__*/
    const noop = (any) => any;

    let invariant = noop;

    /*
      Progress within given range

      Given a lower limit and an upper limit, we return the progress
      (expressed as a number 0-1) represented by the given value, and
      limit that progress to within 0-1.

      @param [number]: Lower limit
      @param [number]: Upper limit
      @param [number]: Value to find progress within given range
      @return [number]: Progress of value within range as expressed 0-1
    */
    /*#__NO_SIDE_EFFECTS__*/
    const progress = (from, to, value) => {
        const toFromDifference = to - from;
        return toFromDifference === 0 ? 1 : (value - from) / toFromDifference;
    };

    /*#__NO_SIDE_EFFECTS__*/
    function memo(callback) {
        let result;
        return () => {
            if (result === undefined)
                result = callback();
            return result;
        };
    }

    const supportsScrollTimeline = memo(() => window.ScrollTimeline !== undefined);

    class BaseGroupPlaybackControls {
        constructor(animations) {
            // Bound to accomodate common `return animation.stop` pattern
            this.stop = () => this.runAll("stop");
            this.animations = animations.filter(Boolean);
        }
        get finished() {
            // Support for new finished Promise and legacy thennable API
            return Promise.all(this.animations.map((animation) => "finished" in animation ? animation.finished : animation));
        }
        /**
         * TODO: Filter out cancelled or stopped animations before returning
         */
        getAll(propName) {
            return this.animations[0][propName];
        }
        setAll(propName, newValue) {
            for (let i = 0; i < this.animations.length; i++) {
                this.animations[i][propName] = newValue;
            }
        }
        attachTimeline(timeline, fallback) {
            const subscriptions = this.animations.map((animation) => {
                if (supportsScrollTimeline() && animation.attachTimeline) {
                    return animation.attachTimeline(timeline);
                }
                else if (typeof fallback === "function") {
                    return fallback(animation);
                }
            });
            return () => {
                subscriptions.forEach((cancel, i) => {
                    cancel && cancel();
                    this.animations[i].stop();
                });
            };
        }
        get time() {
            return this.getAll("time");
        }
        set time(time) {
            this.setAll("time", time);
        }
        get speed() {
            return this.getAll("speed");
        }
        set speed(speed) {
            this.setAll("speed", speed);
        }
        get startTime() {
            return this.getAll("startTime");
        }
        get duration() {
            let max = 0;
            for (let i = 0; i < this.animations.length; i++) {
                max = Math.max(max, this.animations[i].duration);
            }
            return max;
        }
        runAll(methodName) {
            this.animations.forEach((controls) => controls[methodName]());
        }
        flatten() {
            this.runAll("flatten");
        }
        play() {
            this.runAll("play");
        }
        pause() {
            this.runAll("pause");
        }
        cancel() {
            this.runAll("cancel");
        }
        complete() {
            this.runAll("complete");
        }
    }

    /**
     * TODO: This is a temporary class to support the legacy
     * thennable API
     */
    class GroupPlaybackControls extends BaseGroupPlaybackControls {
        then(onResolve, onReject) {
            return Promise.all(this.animations).then(onResolve).catch(onReject);
        }
    }

    /**
     * Converts seconds to milliseconds
     *
     * @param seconds - Time in seconds.
     * @return milliseconds - Converted time in milliseconds.
     */
    /*#__NO_SIDE_EFFECTS__*/
    const secondsToMilliseconds = (seconds) => seconds * 1000;
    /*#__NO_SIDE_EFFECTS__*/
    const millisecondsToSeconds = (milliseconds) => milliseconds / 1000;

    /**
     * Implement a practical max duration for keyframe generation
     * to prevent infinite loops
     */
    const maxGeneratorDuration = 20000;
    function calcGeneratorDuration(generator) {
        let duration = 0;
        const timeStep = 50;
        let state = generator.next(duration);
        while (!state.done && duration < maxGeneratorDuration) {
            duration += timeStep;
            state = generator.next(duration);
        }
        return duration >= maxGeneratorDuration ? Infinity : duration;
    }

    const generateLinearEasing = (easing, duration, // as milliseconds
    resolution = 10 // as milliseconds
    ) => {
        let points = "";
        const numPoints = Math.max(Math.round(duration / resolution), 2);
        for (let i = 0; i < numPoints; i++) {
            points += easing(progress(0, numPoints - 1, i)) + ", ";
        }
        return `linear(${points.substring(0, points.length - 2)})`;
    };

    const clamp = (min, max, v) => {
        if (v > max)
            return max;
        if (v < min)
            return min;
        return v;
    };

    /*
      Convert velocity into velocity per second

      @param [number]: Unit per frame
      @param [number]: Frame duration in ms
    */
    function velocityPerSecond(velocity, frameDuration) {
        return frameDuration ? velocity * (1000 / frameDuration) : 0;
    }

    const velocitySampleDuration = 5; // ms
    function calcGeneratorVelocity(resolveValue, t, current) {
        const prevT = Math.max(t - velocitySampleDuration, 0);
        return velocityPerSecond(current - resolveValue(prevT), t - prevT);
    }

    const springDefaults = {
        // Default spring physics
        stiffness: 100,
        damping: 10,
        mass: 1.0,
        velocity: 0.0,
        // Default duration/bounce-based options
        duration: 800, // in ms
        bounce: 0.3,
        visualDuration: 0.3, // in seconds
        // Rest thresholds
        restSpeed: {
            granular: 0.01,
            default: 2,
        },
        restDelta: {
            granular: 0.005,
            default: 0.5,
        },
        // Limits
        minDuration: 0.01, // in seconds
        maxDuration: 10.0, // in seconds
        minDamping: 0.05,
        maxDamping: 1,
    };

    const safeMin = 0.001;
    function findSpring({ duration = springDefaults.duration, bounce = springDefaults.bounce, velocity = springDefaults.velocity, mass = springDefaults.mass, }) {
        let envelope;
        let derivative;
        let dampingRatio = 1 - bounce;
        /**
         * Restrict dampingRatio and duration to within acceptable ranges.
         */
        dampingRatio = clamp(springDefaults.minDamping, springDefaults.maxDamping, dampingRatio);
        duration = clamp(springDefaults.minDuration, springDefaults.maxDuration, millisecondsToSeconds(duration));
        if (dampingRatio < 1) {
            /**
             * Underdamped spring
             */
            envelope = (undampedFreq) => {
                const exponentialDecay = undampedFreq * dampingRatio;
                const delta = exponentialDecay * duration;
                const a = exponentialDecay - velocity;
                const b = calcAngularFreq(undampedFreq, dampingRatio);
                const c = Math.exp(-delta);
                return safeMin - (a / b) * c;
            };
            derivative = (undampedFreq) => {
                const exponentialDecay = undampedFreq * dampingRatio;
                const delta = exponentialDecay * duration;
                const d = delta * velocity + velocity;
                const e = Math.pow(dampingRatio, 2) * Math.pow(undampedFreq, 2) * duration;
                const f = Math.exp(-delta);
                const g = calcAngularFreq(Math.pow(undampedFreq, 2), dampingRatio);
                const factor = -envelope(undampedFreq) + safeMin > 0 ? -1 : 1;
                return (factor * ((d - e) * f)) / g;
            };
        }
        else {
            /**
             * Critically-damped spring
             */
            envelope = (undampedFreq) => {
                const a = Math.exp(-undampedFreq * duration);
                const b = (undampedFreq - velocity) * duration + 1;
                return -1e-3 + a * b;
            };
            derivative = (undampedFreq) => {
                const a = Math.exp(-undampedFreq * duration);
                const b = (velocity - undampedFreq) * (duration * duration);
                return a * b;
            };
        }
        const initialGuess = 5 / duration;
        const undampedFreq = approximateRoot(envelope, derivative, initialGuess);
        duration = secondsToMilliseconds(duration);
        if (isNaN(undampedFreq)) {
            return {
                stiffness: springDefaults.stiffness,
                damping: springDefaults.damping,
                duration,
            };
        }
        else {
            const stiffness = Math.pow(undampedFreq, 2) * mass;
            return {
                stiffness,
                damping: dampingRatio * 2 * Math.sqrt(mass * stiffness),
                duration,
            };
        }
    }
    const rootIterations = 12;
    function approximateRoot(envelope, derivative, initialGuess) {
        let result = initialGuess;
        for (let i = 1; i < rootIterations; i++) {
            result = result - envelope(result) / derivative(result);
        }
        return result;
    }
    function calcAngularFreq(undampedFreq, dampingRatio) {
        return undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
    }

    const durationKeys = ["duration", "bounce"];
    const physicsKeys = ["stiffness", "damping", "mass"];
    function isSpringType(options, keys) {
        return keys.some((key) => options[key] !== undefined);
    }
    function getSpringOptions(options) {
        let springOptions = {
            velocity: springDefaults.velocity,
            stiffness: springDefaults.stiffness,
            damping: springDefaults.damping,
            mass: springDefaults.mass,
            isResolvedFromDuration: false,
            ...options,
        };
        // stiffness/damping/mass overrides duration/bounce
        if (!isSpringType(options, physicsKeys) &&
            isSpringType(options, durationKeys)) {
            if (options.visualDuration) {
                const visualDuration = options.visualDuration;
                const root = (2 * Math.PI) / (visualDuration * 1.2);
                const stiffness = root * root;
                const damping = 2 *
                    clamp(0.05, 1, 1 - (options.bounce || 0)) *
                    Math.sqrt(stiffness);
                springOptions = {
                    ...springOptions,
                    mass: springDefaults.mass,
                    stiffness,
                    damping,
                };
            }
            else {
                const derived = findSpring(options);
                springOptions = {
                    ...springOptions,
                    ...derived,
                    mass: springDefaults.mass,
                };
                springOptions.isResolvedFromDuration = true;
            }
        }
        return springOptions;
    }
    function spring(optionsOrVisualDuration = springDefaults.visualDuration, bounce = springDefaults.bounce) {
        const options = typeof optionsOrVisualDuration !== "object"
            ? {
                visualDuration: optionsOrVisualDuration,
                keyframes: [0, 1],
                bounce,
            }
            : optionsOrVisualDuration;
        let { restSpeed, restDelta } = options;
        const origin = options.keyframes[0];
        const target = options.keyframes[options.keyframes.length - 1];
        /**
         * This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
         * to reduce GC during animation.
         */
        const state = { done: false, value: origin };
        const { stiffness, damping, mass, duration, velocity, isResolvedFromDuration, } = getSpringOptions({
            ...options,
            velocity: -millisecondsToSeconds(options.velocity || 0),
        });
        const initialVelocity = velocity || 0.0;
        const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
        const initialDelta = target - origin;
        const undampedAngularFreq = millisecondsToSeconds(Math.sqrt(stiffness / mass));
        /**
         * If we're working on a granular scale, use smaller defaults for determining
         * when the spring is finished.
         *
         * These defaults have been selected emprically based on what strikes a good
         * ratio between feeling good and finishing as soon as changes are imperceptible.
         */
        const isGranularScale = Math.abs(initialDelta) < 5;
        restSpeed || (restSpeed = isGranularScale
            ? springDefaults.restSpeed.granular
            : springDefaults.restSpeed.default);
        restDelta || (restDelta = isGranularScale
            ? springDefaults.restDelta.granular
            : springDefaults.restDelta.default);
        let resolveSpring;
        if (dampingRatio < 1) {
            const angularFreq = calcAngularFreq(undampedAngularFreq, dampingRatio);
            // Underdamped spring
            resolveSpring = (t) => {
                const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
                return (target -
                    envelope *
                        (((initialVelocity +
                            dampingRatio * undampedAngularFreq * initialDelta) /
                            angularFreq) *
                            Math.sin(angularFreq * t) +
                            initialDelta * Math.cos(angularFreq * t)));
            };
        }
        else if (dampingRatio === 1) {
            // Critically damped spring
            resolveSpring = (t) => target -
                Math.exp(-undampedAngularFreq * t) *
                    (initialDelta +
                        (initialVelocity + undampedAngularFreq * initialDelta) * t);
        }
        else {
            // Overdamped spring
            const dampedAngularFreq = undampedAngularFreq * Math.sqrt(dampingRatio * dampingRatio - 1);
            resolveSpring = (t) => {
                const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
                // When performing sinh or cosh values can hit Infinity so we cap them here
                const freqForT = Math.min(dampedAngularFreq * t, 300);
                return (target -
                    (envelope *
                        ((initialVelocity +
                            dampingRatio * undampedAngularFreq * initialDelta) *
                            Math.sinh(freqForT) +
                            dampedAngularFreq *
                                initialDelta *
                                Math.cosh(freqForT))) /
                        dampedAngularFreq);
            };
        }
        const generator = {
            calculatedDuration: isResolvedFromDuration ? duration || null : null,
            next: (t) => {
                const current = resolveSpring(t);
                if (!isResolvedFromDuration) {
                    let currentVelocity = 0.0;
                    /**
                     * We only need to calculate velocity for under-damped springs
                     * as over- and critically-damped springs can't overshoot, so
                     * checking only for displacement is enough.
                     */
                    if (dampingRatio < 1) {
                        currentVelocity =
                            t === 0
                                ? secondsToMilliseconds(initialVelocity)
                                : calcGeneratorVelocity(resolveSpring, t, current);
                    }
                    const isBelowVelocityThreshold = Math.abs(currentVelocity) <= restSpeed;
                    const isBelowDisplacementThreshold = Math.abs(target - current) <= restDelta;
                    state.done =
                        isBelowVelocityThreshold && isBelowDisplacementThreshold;
                }
                else {
                    state.done = t >= duration;
                }
                state.value = state.done ? target : current;
                return state;
            },
            toString: () => {
                const calculatedDuration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
                const easing = generateLinearEasing((progress) => generator.next(calculatedDuration * progress).value, calculatedDuration, 30);
                return calculatedDuration + "ms " + easing;
            },
        };
        return generator;
    }

    /**
     * Create a progress => progress easing function from a generator.
     */
    function createGeneratorEasing(options, scale = 100, createGenerator) {
        const generator = createGenerator({ ...options, keyframes: [0, scale] });
        const duration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
        return {
            type: "keyframes",
            ease: (progress) => {
                return generator.next(duration * progress).value / scale;
            },
            duration: millisecondsToSeconds(duration),
        };
    }

    function isGenerator(type) {
        return typeof type === "function";
    }

    const wrap = (min, max, v) => {
        const rangeSize = max - min;
        return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
    };

    const isEasingArray = (ease) => {
        return Array.isArray(ease) && typeof ease[0] !== "number";
    };

    function getEasingForSegment(easing, i) {
        return isEasingArray(easing) ? easing[wrap(0, easing.length, i)] : easing;
    }

    /*
      Value in range from progress

      Given a lower limit and an upper limit, we return the value within
      that range as expressed by progress (usually a number from 0 to 1)

      So progress = 0.5 would change

      from -------- to

      to

      from ---- to

      E.g. from = 10, to = 20, progress = 0.5 => 15

      @param [number]: Lower limit of range
      @param [number]: Upper limit of range
      @param [number]: The progress between lower and upper limits expressed 0-1
      @return [number]: Value as calculated from progress within range (not limited within range)
    */
    const mixNumber$1 = (from, to, progress) => {
        return from + (to - from) * progress;
    };

    function fillOffset(offset, remaining) {
        const min = offset[offset.length - 1];
        for (let i = 1; i <= remaining; i++) {
            const offsetProgress = progress(0, remaining, i);
            offset.push(mixNumber$1(min, 1, offsetProgress));
        }
    }

    function defaultOffset$1(arr) {
        const offset = [0];
        fillOffset(offset, arr.length - 1);
        return offset;
    }

    const isMotionValue = (value) => Boolean(value && value.getVelocity);

    function isDOMKeyframes(keyframes) {
        return typeof keyframes === "object" && !Array.isArray(keyframes);
    }

    function resolveSubjects(subject, keyframes, scope, selectorCache) {
        if (typeof subject === "string" && isDOMKeyframes(keyframes)) {
            return resolveElements(subject, scope, selectorCache);
        }
        else if (subject instanceof NodeList) {
            return Array.from(subject);
        }
        else if (Array.isArray(subject)) {
            return subject;
        }
        else {
            return [subject];
        }
    }

    function calculateRepeatDuration(duration, repeat, _repeatDelay) {
        return duration * (repeat + 1);
    }

    /**
     * Given a absolute or relative time definition and current/prev time state of the sequence,
     * calculate an absolute time for the next keyframes.
     */
    function calcNextTime(current, next, prev, labels) {
        var _a;
        if (typeof next === "number") {
            return next;
        }
        else if (next.startsWith("-") || next.startsWith("+")) {
            return Math.max(0, current + parseFloat(next));
        }
        else if (next === "<") {
            return prev;
        }
        else {
            return (_a = labels.get(next)) !== null && _a !== undefined ? _a : current;
        }
    }

    function addUniqueItem(arr, item) {
        if (arr.indexOf(item) === -1)
            arr.push(item);
    }
    function removeItem(arr, item) {
        const index = arr.indexOf(item);
        if (index > -1)
            arr.splice(index, 1);
    }

    function eraseKeyframes(sequence, startTime, endTime) {
        for (let i = 0; i < sequence.length; i++) {
            const keyframe = sequence[i];
            if (keyframe.at > startTime && keyframe.at < endTime) {
                removeItem(sequence, keyframe);
                // If we remove this item we have to push the pointer back one
                i--;
            }
        }
    }
    function addKeyframes(sequence, keyframes, easing, offset, startTime, endTime) {
        /**
         * Erase every existing value between currentTime and targetTime,
         * this will essentially splice this timeline into any currently
         * defined ones.
         */
        eraseKeyframes(sequence, startTime, endTime);
        for (let i = 0; i < keyframes.length; i++) {
            sequence.push({
                value: keyframes[i],
                at: mixNumber$1(startTime, endTime, offset[i]),
                easing: getEasingForSegment(easing, i),
            });
        }
    }

    /**
     * Take an array of times that represent repeated keyframes. For instance
     * if we have original times of [0, 0.5, 1] then our repeated times will
     * be [0, 0.5, 1, 1, 1.5, 2]. Loop over the times and scale them back
     * down to a 0-1 scale.
     */
    function normalizeTimes(times, repeat) {
        for (let i = 0; i < times.length; i++) {
            times[i] = times[i] / (repeat + 1);
        }
    }

    function compareByTime(a, b) {
        if (a.at === b.at) {
            if (a.value === null)
                return 1;
            if (b.value === null)
                return -1;
            return 0;
        }
        else {
            return a.at - b.at;
        }
    }

    const defaultSegmentEasing = "easeInOut";
    function createAnimationsFromSequence(sequence, { defaultTransition = {}, ...sequenceTransition } = {}, scope, generators) {
        const defaultDuration = defaultTransition.duration || 0.3;
        const animationDefinitions = new Map();
        const sequences = new Map();
        const elementCache = {};
        const timeLabels = new Map();
        let prevTime = 0;
        let currentTime = 0;
        let totalDuration = 0;
        /**
         * Build the timeline by mapping over the sequence array and converting
         * the definitions into keyframes and offsets with absolute time values.
         * These will later get converted into relative offsets in a second pass.
         */
        for (let i = 0; i < sequence.length; i++) {
            const segment = sequence[i];
            /**
             * If this is a timeline label, mark it and skip the rest of this iteration.
             */
            if (typeof segment === "string") {
                timeLabels.set(segment, currentTime);
                continue;
            }
            else if (!Array.isArray(segment)) {
                timeLabels.set(segment.name, calcNextTime(currentTime, segment.at, prevTime, timeLabels));
                continue;
            }
            let [subject, keyframes, transition = {}] = segment;
            /**
             * If a relative or absolute time value has been specified we need to resolve
             * it in relation to the currentTime.
             */
            if (transition.at !== undefined) {
                currentTime = calcNextTime(currentTime, transition.at, prevTime, timeLabels);
            }
            /**
             * Keep track of the maximum duration in this definition. This will be
             * applied to currentTime once the definition has been parsed.
             */
            let maxDuration = 0;
            const resolveValueSequence = (valueKeyframes, valueTransition, valueSequence, elementIndex = 0, numSubjects = 0) => {
                const valueKeyframesAsList = keyframesAsList(valueKeyframes);
                const { delay = 0, times = defaultOffset$1(valueKeyframesAsList), type = "keyframes", repeat, repeatType, repeatDelay = 0, ...remainingTransition } = valueTransition;
                let { ease = defaultTransition.ease || "easeOut", duration } = valueTransition;
                /**
                 * Resolve stagger() if defined.
                 */
                const calculatedDelay = typeof delay === "function"
                    ? delay(elementIndex, numSubjects)
                    : delay;
                /**
                 * If this animation should and can use a spring, generate a spring easing function.
                 */
                const numKeyframes = valueKeyframesAsList.length;
                const createGenerator = isGenerator(type)
                    ? type
                    : generators === null || generators === undefined ? undefined : generators[type];
                if (numKeyframes <= 2 && createGenerator) {
                    /**
                     * As we're creating an easing function from a spring,
                     * ideally we want to generate it using the real distance
                     * between the two keyframes. However this isn't always
                     * possible - in these situations we use 0-100.
                     */
                    let absoluteDelta = 100;
                    if (numKeyframes === 2 &&
                        isNumberKeyframesArray(valueKeyframesAsList)) {
                        const delta = valueKeyframesAsList[1] - valueKeyframesAsList[0];
                        absoluteDelta = Math.abs(delta);
                    }
                    const springTransition = { ...remainingTransition };
                    if (duration !== undefined) {
                        springTransition.duration = secondsToMilliseconds(duration);
                    }
                    const springEasing = createGeneratorEasing(springTransition, absoluteDelta, createGenerator);
                    ease = springEasing.ease;
                    duration = springEasing.duration;
                }
                duration !== null && duration !== undefined ? duration : (duration = defaultDuration);
                const startTime = currentTime + calculatedDelay;
                /**
                 * If there's only one time offset of 0, fill in a second with length 1
                 */
                if (times.length === 1 && times[0] === 0) {
                    times[1] = 1;
                }
                /**
                 * Fill out if offset if fewer offsets than keyframes
                 */
                const remainder = times.length - valueKeyframesAsList.length;
                remainder > 0 && fillOffset(times, remainder);
                /**
                 * If only one value has been set, ie [1], push a null to the start of
                 * the keyframe array. This will let us mark a keyframe at this point
                 * that will later be hydrated with the previous value.
                 */
                valueKeyframesAsList.length === 1 &&
                    valueKeyframesAsList.unshift(null);
                /**
                 * Handle repeat options
                 */
                if (repeat) {
                    duration = calculateRepeatDuration(duration, repeat);
                    const originalKeyframes = [...valueKeyframesAsList];
                    const originalTimes = [...times];
                    ease = Array.isArray(ease) ? [...ease] : [ease];
                    const originalEase = [...ease];
                    for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex++) {
                        valueKeyframesAsList.push(...originalKeyframes);
                        for (let keyframeIndex = 0; keyframeIndex < originalKeyframes.length; keyframeIndex++) {
                            times.push(originalTimes[keyframeIndex] + (repeatIndex + 1));
                            ease.push(keyframeIndex === 0
                                ? "linear"
                                : getEasingForSegment(originalEase, keyframeIndex - 1));
                        }
                    }
                    normalizeTimes(times, repeat);
                }
                const targetTime = startTime + duration;
                /**
                 * Add keyframes, mapping offsets to absolute time.
                 */
                addKeyframes(valueSequence, valueKeyframesAsList, ease, times, startTime, targetTime);
                maxDuration = Math.max(calculatedDelay + duration, maxDuration);
                totalDuration = Math.max(targetTime, totalDuration);
            };
            if (isMotionValue(subject)) {
                const subjectSequence = getSubjectSequence(subject, sequences);
                resolveValueSequence(keyframes, transition, getValueSequence("default", subjectSequence));
            }
            else {
                const subjects = resolveSubjects(subject, keyframes, scope, elementCache);
                const numSubjects = subjects.length;
                /**
                 * For every element in this segment, process the defined values.
                 */
                for (let subjectIndex = 0; subjectIndex < numSubjects; subjectIndex++) {
                    /**
                     * Cast necessary, but we know these are of this type
                     */
                    keyframes = keyframes;
                    transition = transition;
                    const thisSubject = subjects[subjectIndex];
                    const subjectSequence = getSubjectSequence(thisSubject, sequences);
                    for (const key in keyframes) {
                        resolveValueSequence(keyframes[key], getValueTransition$1(transition, key), getValueSequence(key, subjectSequence), subjectIndex, numSubjects);
                    }
                }
            }
            prevTime = currentTime;
            currentTime += maxDuration;
        }
        /**
         * For every element and value combination create a new animation.
         */
        sequences.forEach((valueSequences, element) => {
            for (const key in valueSequences) {
                const valueSequence = valueSequences[key];
                /**
                 * Arrange all the keyframes in ascending time order.
                 */
                valueSequence.sort(compareByTime);
                const keyframes = [];
                const valueOffset = [];
                const valueEasing = [];
                /**
                 * For each keyframe, translate absolute times into
                 * relative offsets based on the total duration of the timeline.
                 */
                for (let i = 0; i < valueSequence.length; i++) {
                    const { at, value, easing } = valueSequence[i];
                    keyframes.push(value);
                    valueOffset.push(progress(0, totalDuration, at));
                    valueEasing.push(easing || "easeOut");
                }
                /**
                 * If the first keyframe doesn't land on offset: 0
                 * provide one by duplicating the initial keyframe. This ensures
                 * it snaps to the first keyframe when the animation starts.
                 */
                if (valueOffset[0] !== 0) {
                    valueOffset.unshift(0);
                    keyframes.unshift(keyframes[0]);
                    valueEasing.unshift(defaultSegmentEasing);
                }
                /**
                 * If the last keyframe doesn't land on offset: 1
                 * provide one with a null wildcard value. This will ensure it
                 * stays static until the end of the animation.
                 */
                if (valueOffset[valueOffset.length - 1] !== 1) {
                    valueOffset.push(1);
                    keyframes.push(null);
                }
                if (!animationDefinitions.has(element)) {
                    animationDefinitions.set(element, {
                        keyframes: {},
                        transition: {},
                    });
                }
                const definition = animationDefinitions.get(element);
                definition.keyframes[key] = keyframes;
                definition.transition[key] = {
                    ...defaultTransition,
                    duration: totalDuration,
                    ease: valueEasing,
                    times: valueOffset,
                    ...sequenceTransition,
                };
            }
        });
        return animationDefinitions;
    }
    function getSubjectSequence(subject, sequences) {
        !sequences.has(subject) && sequences.set(subject, {});
        return sequences.get(subject);
    }
    function getValueSequence(name, sequences) {
        if (!sequences[name])
            sequences[name] = [];
        return sequences[name];
    }
    function keyframesAsList(keyframes) {
        return Array.isArray(keyframes) ? keyframes : [keyframes];
    }
    function getValueTransition$1(transition, key) {
        return transition && transition[key]
            ? {
                ...transition,
                ...transition[key],
            }
            : { ...transition };
    }
    const isNumber = (keyframe) => typeof keyframe === "number";
    const isNumberKeyframesArray = (keyframes) => keyframes.every(isNumber);

    const visualElementStore = new WeakMap();

    function getValueTransition(transition, key) {
        return transition
            ? transition[key] ||
                transition["default"] ||
                transition
            : undefined;
    }

    /**
     * Generate a list of every possible transform key.
     */
    const transformPropOrder = [
        "transformPerspective",
        "x",
        "y",
        "z",
        "translateX",
        "translateY",
        "translateZ",
        "scale",
        "scaleX",
        "scaleY",
        "rotate",
        "rotateX",
        "rotateY",
        "rotateZ",
        "skew",
        "skewX",
        "skewY",
    ];
    /**
     * A quick lookup for transform props.
     */
    const transformProps = new Set(transformPropOrder);

    const positionalKeys = new Set([
        "width",
        "height",
        "top",
        "left",
        "right",
        "bottom",
        ...transformPropOrder,
    ]);

    const isKeyframesTarget = (v) => {
        return Array.isArray(v);
    };

    const resolveFinalValueInKeyframes = (v) => {
        // TODO maybe throw if v.length - 1 is placeholder token?
        return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
    };

    const MotionGlobalConfig = {
        useManualTiming: false,
    };

    function createRenderStep(runNextFrame) {
        /**
         * We create and reuse two queues, one to queue jobs for the current frame
         * and one for the next. We reuse to avoid triggering GC after x frames.
         */
        let thisFrame = new Set();
        let nextFrame = new Set();
        /**
         * Track whether we're currently processing jobs in this step. This way
         * we can decide whether to schedule new jobs for this frame or next.
         */
        let isProcessing = false;
        let flushNextFrame = false;
        /**
         * A set of processes which were marked keepAlive when scheduled.
         */
        const toKeepAlive = new WeakSet();
        let latestFrameData = {
            delta: 0.0,
            timestamp: 0.0,
            isProcessing: false,
        };
        function triggerCallback(callback) {
            if (toKeepAlive.has(callback)) {
                step.schedule(callback);
                runNextFrame();
            }
            callback(latestFrameData);
        }
        const step = {
            /**
             * Schedule a process to run on the next frame.
             */
            schedule: (callback, keepAlive = false, immediate = false) => {
                const addToCurrentFrame = immediate && isProcessing;
                const queue = addToCurrentFrame ? thisFrame : nextFrame;
                if (keepAlive)
                    toKeepAlive.add(callback);
                if (!queue.has(callback))
                    queue.add(callback);
                return callback;
            },
            /**
             * Cancel the provided callback from running on the next frame.
             */
            cancel: (callback) => {
                nextFrame.delete(callback);
                toKeepAlive.delete(callback);
            },
            /**
             * Execute all schedule callbacks.
             */
            process: (frameData) => {
                latestFrameData = frameData;
                /**
                 * If we're already processing we've probably been triggered by a flushSync
                 * inside an existing process. Instead of executing, mark flushNextFrame
                 * as true and ensure we flush the following frame at the end of this one.
                 */
                if (isProcessing) {
                    flushNextFrame = true;
                    return;
                }
                isProcessing = true;
                [thisFrame, nextFrame] = [nextFrame, thisFrame];
                // Execute this frame
                thisFrame.forEach(triggerCallback);
                // Clear the frame so no callbacks remain. This is to avoid
                // memory leaks should this render step not run for a while.
                thisFrame.clear();
                isProcessing = false;
                if (flushNextFrame) {
                    flushNextFrame = false;
                    step.process(frameData);
                }
            },
        };
        return step;
    }

    const stepsOrder = [
        "read", // Read
        "resolveKeyframes", // Write/Read/Write/Read
        "update", // Compute
        "preRender", // Compute
        "render", // Write
        "postRender", // Compute
    ];
    const maxElapsed$1 = 40;
    function createRenderBatcher(scheduleNextBatch, allowKeepAlive) {
        let runNextFrame = false;
        let useDefaultElapsed = true;
        const state = {
            delta: 0.0,
            timestamp: 0.0,
            isProcessing: false,
        };
        const flagRunNextFrame = () => (runNextFrame = true);
        const steps = stepsOrder.reduce((acc, key) => {
            acc[key] = createRenderStep(flagRunNextFrame);
            return acc;
        }, {});
        const { read, resolveKeyframes, update, preRender, render, postRender } = steps;
        const processBatch = () => {
            const timestamp = performance.now();
            runNextFrame = false;
            state.delta = useDefaultElapsed
                ? 1000 / 60
                : Math.max(Math.min(timestamp - state.timestamp, maxElapsed$1), 1);
            state.timestamp = timestamp;
            state.isProcessing = true;
            // Unrolled render loop for better per-frame performance
            read.process(state);
            resolveKeyframes.process(state);
            update.process(state);
            preRender.process(state);
            render.process(state);
            postRender.process(state);
            state.isProcessing = false;
            if (runNextFrame && allowKeepAlive) {
                useDefaultElapsed = false;
                scheduleNextBatch(processBatch);
            }
        };
        const wake = () => {
            runNextFrame = true;
            useDefaultElapsed = true;
            if (!state.isProcessing) {
                scheduleNextBatch(processBatch);
            }
        };
        const schedule = stepsOrder.reduce((acc, key) => {
            const step = steps[key];
            acc[key] = (process, keepAlive = false, immediate = false) => {
                if (!runNextFrame)
                    wake();
                return step.schedule(process, keepAlive, immediate);
            };
            return acc;
        }, {});
        const cancel = (process) => {
            for (let i = 0; i < stepsOrder.length; i++) {
                steps[stepsOrder[i]].cancel(process);
            }
        };
        return { schedule, cancel, state, steps };
    }

    const { schedule: frame, cancel: cancelFrame, state: frameData} = createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : noop, true);

    let now;
    function clearTime() {
        now = undefined;
    }
    /**
     * An eventloop-synchronous alternative to performance.now().
     *
     * Ensures that time measurements remain consistent within a synchronous context.
     * Usually calling performance.now() twice within the same synchronous context
     * will return different values which isn't useful for animations when we're usually
     * trying to sync animations to the same frame.
     */
    const time = {
        now: () => {
            if (now === undefined) {
                time.set(frameData.isProcessing || MotionGlobalConfig.useManualTiming
                    ? frameData.timestamp
                    : performance.now());
            }
            return now;
        },
        set: (newTime) => {
            now = newTime;
            queueMicrotask(clearTime);
        },
    };

    class SubscriptionManager {
        constructor() {
            this.subscriptions = [];
        }
        add(handler) {
            addUniqueItem(this.subscriptions, handler);
            return () => removeItem(this.subscriptions, handler);
        }
        notify(a, b, c) {
            const numSubscriptions = this.subscriptions.length;
            if (!numSubscriptions)
                return;
            if (numSubscriptions === 1) {
                /**
                 * If there's only a single handler we can just call it without invoking a loop.
                 */
                this.subscriptions[0](a, b, c);
            }
            else {
                for (let i = 0; i < numSubscriptions; i++) {
                    /**
                     * Check whether the handler exists before firing as it's possible
                     * the subscriptions were modified during this loop running.
                     */
                    const handler = this.subscriptions[i];
                    handler && handler(a, b, c);
                }
            }
        }
        getSize() {
            return this.subscriptions.length;
        }
        clear() {
            this.subscriptions.length = 0;
        }
    }

    /**
     * Maximum time between the value of two frames, beyond which we
     * assume the velocity has since been 0.
     */
    const MAX_VELOCITY_DELTA = 30;
    const isFloat = (value) => {
        return !isNaN(parseFloat(value));
    };
    /**
     * `MotionValue` is used to track the state and velocity of motion values.
     *
     * @public
     */
    class MotionValue {
        /**
         * @param init - The initiating value
         * @param config - Optional configuration options
         *
         * -  `transformer`: A function to transform incoming values with.
         *
         * @internal
         */
        constructor(init, options = {}) {
            /**
             * This will be replaced by the build step with the latest version number.
             * When MotionValues are provided to motion components, warn if versions are mixed.
             */
            this.version = "12.0.11";
            /**
             * Tracks whether this value can output a velocity. Currently this is only true
             * if the value is numerical, but we might be able to widen the scope here and support
             * other value types.
             *
             * @internal
             */
            this.canTrackVelocity = null;
            /**
             * An object containing a SubscriptionManager for each active event.
             */
            this.events = {};
            this.updateAndNotify = (v, render = true) => {
                const currentTime = time.now();
                /**
                 * If we're updating the value during another frame or eventloop
                 * than the previous frame, then the we set the previous frame value
                 * to current.
                 */
                if (this.updatedAt !== currentTime) {
                    this.setPrevFrameValue();
                }
                this.prev = this.current;
                this.setCurrent(v);
                // Update update subscribers
                if (this.current !== this.prev && this.events.change) {
                    this.events.change.notify(this.current);
                }
                // Update render subscribers
                if (render && this.events.renderRequest) {
                    this.events.renderRequest.notify(this.current);
                }
            };
            this.hasAnimated = false;
            this.setCurrent(init);
            this.owner = options.owner;
        }
        setCurrent(current) {
            this.current = current;
            this.updatedAt = time.now();
            if (this.canTrackVelocity === null && current !== undefined) {
                this.canTrackVelocity = isFloat(this.current);
            }
        }
        setPrevFrameValue(prevFrameValue = this.current) {
            this.prevFrameValue = prevFrameValue;
            this.prevUpdatedAt = this.updatedAt;
        }
        /**
         * Adds a function that will be notified when the `MotionValue` is updated.
         *
         * It returns a function that, when called, will cancel the subscription.
         *
         * When calling `onChange` inside a React component, it should be wrapped with the
         * `useEffect` hook. As it returns an unsubscribe function, this should be returned
         * from the `useEffect` function to ensure you don't add duplicate subscribers..
         *
         * ```jsx
         * export const MyComponent = () => {
         *   const x = useMotionValue(0)
         *   const y = useMotionValue(0)
         *   const opacity = useMotionValue(1)
         *
         *   useEffect(() => {
         *     function updateOpacity() {
         *       const maxXY = Math.max(x.get(), y.get())
         *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
         *       opacity.set(newOpacity)
         *     }
         *
         *     const unsubscribeX = x.on("change", updateOpacity)
         *     const unsubscribeY = y.on("change", updateOpacity)
         *
         *     return () => {
         *       unsubscribeX()
         *       unsubscribeY()
         *     }
         *   }, [])
         *
         *   return <motion.div style={{ x }} />
         * }
         * ```
         *
         * @param subscriber - A function that receives the latest value.
         * @returns A function that, when called, will cancel this subscription.
         *
         * @deprecated
         */
        onChange(subscription) {
            return this.on("change", subscription);
        }
        on(eventName, callback) {
            if (!this.events[eventName]) {
                this.events[eventName] = new SubscriptionManager();
            }
            const unsubscribe = this.events[eventName].add(callback);
            if (eventName === "change") {
                return () => {
                    unsubscribe();
                    /**
                     * If we have no more change listeners by the start
                     * of the next frame, stop active animations.
                     */
                    frame.read(() => {
                        if (!this.events.change.getSize()) {
                            this.stop();
                        }
                    });
                };
            }
            return unsubscribe;
        }
        clearListeners() {
            for (const eventManagers in this.events) {
                this.events[eventManagers].clear();
            }
        }
        /**
         * Attaches a passive effect to the `MotionValue`.
         *
         * @internal
         */
        attach(passiveEffect, stopPassiveEffect) {
            this.passiveEffect = passiveEffect;
            this.stopPassiveEffect = stopPassiveEffect;
        }
        /**
         * Sets the state of the `MotionValue`.
         *
         * @remarks
         *
         * ```jsx
         * const x = useMotionValue(0)
         * x.set(10)
         * ```
         *
         * @param latest - Latest value to set.
         * @param render - Whether to notify render subscribers. Defaults to `true`
         *
         * @public
         */
        set(v, render = true) {
            if (!render || !this.passiveEffect) {
                this.updateAndNotify(v, render);
            }
            else {
                this.passiveEffect(v, this.updateAndNotify);
            }
        }
        setWithVelocity(prev, current, delta) {
            this.set(current);
            this.prev = undefined;
            this.prevFrameValue = prev;
            this.prevUpdatedAt = this.updatedAt - delta;
        }
        /**
         * Set the state of the `MotionValue`, stopping any active animations,
         * effects, and resets velocity to `0`.
         */
        jump(v, endAnimation = true) {
            this.updateAndNotify(v);
            this.prev = v;
            this.prevUpdatedAt = this.prevFrameValue = undefined;
            endAnimation && this.stop();
            if (this.stopPassiveEffect)
                this.stopPassiveEffect();
        }
        /**
         * Returns the latest state of `MotionValue`
         *
         * @returns - The latest state of `MotionValue`
         *
         * @public
         */
        get() {
            return this.current;
        }
        /**
         * @public
         */
        getPrevious() {
            return this.prev;
        }
        /**
         * Returns the latest velocity of `MotionValue`
         *
         * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
         *
         * @public
         */
        getVelocity() {
            const currentTime = time.now();
            if (!this.canTrackVelocity ||
                this.prevFrameValue === undefined ||
                currentTime - this.updatedAt > MAX_VELOCITY_DELTA) {
                return 0;
            }
            const delta = Math.min(this.updatedAt - this.prevUpdatedAt, MAX_VELOCITY_DELTA);
            // Casts because of parseFloat's poor typing
            return velocityPerSecond(parseFloat(this.current) -
                parseFloat(this.prevFrameValue), delta);
        }
        /**
         * Registers a new animation to control this `MotionValue`. Only one
         * animation can drive a `MotionValue` at one time.
         *
         * ```jsx
         * value.start()
         * ```
         *
         * @param animation - A function that starts the provided animation
         *
         * @internal
         */
        start(startAnimation) {
            this.stop();
            return new Promise((resolve) => {
                this.hasAnimated = true;
                this.animation = startAnimation(resolve);
                if (this.events.animationStart) {
                    this.events.animationStart.notify();
                }
            }).then(() => {
                if (this.events.animationComplete) {
                    this.events.animationComplete.notify();
                }
                this.clearAnimation();
            });
        }
        /**
         * Stop the currently active animation.
         *
         * @public
         */
        stop() {
            if (this.animation) {
                this.animation.stop();
                if (this.events.animationCancel) {
                    this.events.animationCancel.notify();
                }
            }
            this.clearAnimation();
        }
        /**
         * Returns `true` if this value is currently animating.
         *
         * @public
         */
        isAnimating() {
            return !!this.animation;
        }
        clearAnimation() {
            delete this.animation;
        }
        /**
         * Destroy and clean up subscribers to this `MotionValue`.
         *
         * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
         * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
         * created a `MotionValue` via the `motionValue` function.
         *
         * @public
         */
        destroy() {
            this.clearListeners();
            this.stop();
            if (this.stopPassiveEffect) {
                this.stopPassiveEffect();
            }
        }
    }
    function motionValue(init, options) {
        return new MotionValue(init, options);
    }

    function getValueState(visualElement) {
        const state = [{}, {}];
        visualElement === null || visualElement === undefined ? undefined : visualElement.values.forEach((value, key) => {
            state[0][key] = value.get();
            state[1][key] = value.getVelocity();
        });
        return state;
    }
    function resolveVariantFromProps(props, definition, custom, visualElement) {
        /**
         * If the variant definition is a function, resolve.
         */
        if (typeof definition === "function") {
            const [current, velocity] = getValueState(visualElement);
            definition = definition(custom !== undefined ? custom : props.custom, current, velocity);
        }
        /**
         * If the variant definition is a variant label, or
         * the function returned a variant label, resolve.
         */
        if (typeof definition === "string") {
            definition = props.variants && props.variants[definition];
        }
        /**
         * At this point we've resolved both functions and variant labels,
         * but the resolved variant label might itself have been a function.
         * If so, resolve. This can only have returned a valid target object.
         */
        if (typeof definition === "function") {
            const [current, velocity] = getValueState(visualElement);
            definition = definition(custom !== undefined ? custom : props.custom, current, velocity);
        }
        return definition;
    }

    function resolveVariant(visualElement, definition, custom) {
        const props = visualElement.getProps();
        return resolveVariantFromProps(props, definition, props.custom, visualElement);
    }

    /**
     * Set VisualElement's MotionValue, creating a new MotionValue for it if
     * it doesn't exist.
     */
    function setMotionValue(visualElement, key, value) {
        if (visualElement.hasValue(key)) {
            visualElement.getValue(key).set(value);
        }
        else {
            visualElement.addValue(key, motionValue(value));
        }
    }
    function setTarget(visualElement, definition) {
        const resolved = resolveVariant(visualElement, definition);
        let { transitionEnd = {}, transition = {}, ...target } = resolved || {};
        target = { ...target, ...transitionEnd };
        for (const key in target) {
            const value = resolveFinalValueInKeyframes(target[key]);
            setMotionValue(visualElement, key, value);
        }
    }

    function isWillChangeMotionValue(value) {
        return Boolean(isMotionValue(value) && value.add);
    }

    function addValueToWillChange(visualElement, key) {
        const willChange = visualElement.getValue("willChange");
        /**
         * It could be that a user has set willChange to a regular MotionValue,
         * in which case we can't add the value to it.
         */
        if (isWillChangeMotionValue(willChange)) {
            return willChange.add(key);
        }
    }

    /**
     * Convert camelCase to dash-case properties.
     */
    const camelToDash = (str) => str.replace(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase();

    const optimizedAppearDataId = "framerAppearId";
    const optimizedAppearDataAttribute = "data-" + camelToDash(optimizedAppearDataId);

    function getOptimisedAppearId(visualElement) {
        return visualElement.props[optimizedAppearDataAttribute];
    }

    function attachTimeline(animation, timeline) {
        animation.timeline = timeline;
        animation.onfinish = null;
    }

    const isBezierDefinition = (easing) => Array.isArray(easing) && typeof easing[0] === "number";

    /**
     * Add the ability for test suites to manually set support flags
     * to better test more environments.
     */
    const supportsFlags = {
        linearEasing: undefined,
    };

    function memoSupports(callback, supportsFlag) {
        const memoized = memo(callback);
        return () => { var _a; return (_a = supportsFlags[supportsFlag]) !== null && _a !== undefined ? _a : memoized(); };
    }

    const supportsLinearEasing = /*@__PURE__*/ memoSupports(() => {
        try {
            document
                .createElement("div")
                .animate({ opacity: 0 }, { easing: "linear(0, 1)" });
        }
        catch (e) {
            return false;
        }
        return true;
    }, "linearEasing");

    function isWaapiSupportedEasing(easing) {
        return Boolean((typeof easing === "function" && supportsLinearEasing()) ||
            !easing ||
            (typeof easing === "string" &&
                (easing in supportedWaapiEasing || supportsLinearEasing())) ||
            isBezierDefinition(easing) ||
            (Array.isArray(easing) && easing.every(isWaapiSupportedEasing)));
    }
    const cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
    const supportedWaapiEasing = {
        linear: "linear",
        ease: "ease",
        easeIn: "ease-in",
        easeOut: "ease-out",
        easeInOut: "ease-in-out",
        circIn: /*@__PURE__*/ cubicBezierAsString([0, 0.65, 0.55, 1]),
        circOut: /*@__PURE__*/ cubicBezierAsString([0.55, 0, 1, 0.45]),
        backIn: /*@__PURE__*/ cubicBezierAsString([0.31, 0.01, 0.66, -0.59]),
        backOut: /*@__PURE__*/ cubicBezierAsString([0.33, 1.53, 0.69, 0.99]),
    };
    function mapEasingToNativeEasing(easing, duration) {
        if (!easing) {
            return undefined;
        }
        else if (typeof easing === "function" && supportsLinearEasing()) {
            return generateLinearEasing(easing, duration);
        }
        else if (isBezierDefinition(easing)) {
            return cubicBezierAsString(easing);
        }
        else if (Array.isArray(easing)) {
            return easing.map((segmentEasing) => mapEasingToNativeEasing(segmentEasing, duration) ||
                supportedWaapiEasing.easeOut);
        }
        else {
            return supportedWaapiEasing[easing];
        }
    }

    /*
      Bezier function generator
      This has been modified from Gaëtan Renaudeau's BezierEasing
      https://github.com/gre/bezier-easing/blob/master/src/index.js
      https://github.com/gre/bezier-easing/blob/master/LICENSE
      
      I've removed the newtonRaphsonIterate algo because in benchmarking it
      wasn't noticiably faster than binarySubdivision, indeed removing it
      usually improved times, depending on the curve.
      I also removed the lookup table, as for the added bundle size and loop we're
      only cutting ~4 or so subdivision iterations. I bumped the max iterations up
      to 12 to compensate and this still tended to be faster for no perceivable
      loss in accuracy.
      Usage
        const easeOut = cubicBezier(.17,.67,.83,.67);
        const x = easeOut(0.5); // returns 0.627...
    */
    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    const calcBezier = (t, a1, a2) => (((1.0 - 3.0 * a2 + 3.0 * a1) * t + (3.0 * a2 - 6.0 * a1)) * t + 3.0 * a1) *
        t;
    const subdivisionPrecision = 0.0000001;
    const subdivisionMaxIterations = 12;
    function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
        let currentX;
        let currentT;
        let i = 0;
        do {
            currentT = lowerBound + (upperBound - lowerBound) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - x;
            if (currentX > 0.0) {
                upperBound = currentT;
            }
            else {
                lowerBound = currentT;
            }
        } while (Math.abs(currentX) > subdivisionPrecision &&
            ++i < subdivisionMaxIterations);
        return currentT;
    }
    function cubicBezier(mX1, mY1, mX2, mY2) {
        // If this is a linear gradient, return linear easing
        if (mX1 === mY1 && mX2 === mY2)
            return noop;
        const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
        // If animation is at start/end, return t without easing
        return (t) => t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2);
    }

    // Accepts an easing function and returns a new one that outputs mirrored values for
    // the second half of the animation. Turns easeIn into easeInOut.
    const mirrorEasing = (easing) => (p) => p <= 0.5 ? easing(2 * p) / 2 : (2 - easing(2 * (1 - p))) / 2;

    // Accepts an easing function and returns a new one that outputs reversed values.
    // Turns easeIn into easeOut.
    const reverseEasing = (easing) => (p) => 1 - easing(1 - p);

    const backOut = /*@__PURE__*/ cubicBezier(0.33, 1.53, 0.69, 0.99);
    const backIn = /*@__PURE__*/ reverseEasing(backOut);
    const backInOut = /*@__PURE__*/ mirrorEasing(backIn);

    const anticipate = (p) => (p *= 2) < 1 ? 0.5 * backIn(p) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));

    const circIn = (p) => 1 - Math.sin(Math.acos(p));
    const circOut = reverseEasing(circIn);
    const circInOut = mirrorEasing(circIn);

    /**
     * Check if the value is a zero value string like "0px" or "0%"
     */
    const isZeroValueString = (v) => /^0[^.\s]+$/u.test(v);

    function isNone(value) {
        if (typeof value === "number") {
            return value === 0;
        }
        else if (value !== null) {
            return value === "none" || value === "0" || isZeroValueString(value);
        }
        else {
            return true;
        }
    }

    const number = {
        test: (v) => typeof v === "number",
        parse: parseFloat,
        transform: (v) => v,
    };
    const alpha = {
        ...number,
        transform: (v) => clamp(0, 1, v),
    };
    const scale = {
        ...number,
        default: 1,
    };

    // If this number is a decimal, make it just five decimal places
    // to avoid exponents
    const sanitize = (v) => Math.round(v * 100000) / 100000;

    const floatRegex = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;

    function isNullish(v) {
        return v == null;
    }

    const singleColorRegex = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu;

    /**
     * Returns true if the provided string is a color, ie rgba(0,0,0,0) or #000,
     * but false if a number or multiple colors
     */
    const isColorString = (type, testProp) => (v) => {
        return Boolean((typeof v === "string" &&
            singleColorRegex.test(v) &&
            v.startsWith(type)) ||
            (testProp &&
                !isNullish(v) &&
                Object.prototype.hasOwnProperty.call(v, testProp)));
    };
    const splitColor = (aName, bName, cName) => (v) => {
        if (typeof v !== "string")
            return v;
        const [a, b, c, alpha] = v.match(floatRegex);
        return {
            [aName]: parseFloat(a),
            [bName]: parseFloat(b),
            [cName]: parseFloat(c),
            alpha: alpha !== undefined ? parseFloat(alpha) : 1,
        };
    };

    const clampRgbUnit = (v) => clamp(0, 255, v);
    const rgbUnit = {
        ...number,
        transform: (v) => Math.round(clampRgbUnit(v)),
    };
    const rgba = {
        test: /*@__PURE__*/ isColorString("rgb", "red"),
        parse: /*@__PURE__*/ splitColor("red", "green", "blue"),
        transform: ({ red, green, blue, alpha: alpha$1 = 1 }) => "rgba(" +
            rgbUnit.transform(red) +
            ", " +
            rgbUnit.transform(green) +
            ", " +
            rgbUnit.transform(blue) +
            ", " +
            sanitize(alpha.transform(alpha$1)) +
            ")",
    };

    function parseHex(v) {
        let r = "";
        let g = "";
        let b = "";
        let a = "";
        // If we have 6 characters, ie #FF0000
        if (v.length > 5) {
            r = v.substring(1, 3);
            g = v.substring(3, 5);
            b = v.substring(5, 7);
            a = v.substring(7, 9);
            // Or we have 3 characters, ie #F00
        }
        else {
            r = v.substring(1, 2);
            g = v.substring(2, 3);
            b = v.substring(3, 4);
            a = v.substring(4, 5);
            r += r;
            g += g;
            b += b;
            a += a;
        }
        return {
            red: parseInt(r, 16),
            green: parseInt(g, 16),
            blue: parseInt(b, 16),
            alpha: a ? parseInt(a, 16) / 255 : 1,
        };
    }
    const hex = {
        test: /*@__PURE__*/ isColorString("#"),
        parse: parseHex,
        transform: rgba.transform,
    };

    const createUnitType = (unit) => ({
        test: (v) => typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
        parse: parseFloat,
        transform: (v) => `${v}${unit}`,
    });
    const degrees = /*@__PURE__*/ createUnitType("deg");
    const percent = /*@__PURE__*/ createUnitType("%");
    const px = /*@__PURE__*/ createUnitType("px");
    const vh = /*@__PURE__*/ createUnitType("vh");
    const vw = /*@__PURE__*/ createUnitType("vw");
    const progressPercentage = {
        ...percent,
        parse: (v) => percent.parse(v) / 100,
        transform: (v) => percent.transform(v * 100),
    };

    const hsla = {
        test: /*@__PURE__*/ isColorString("hsl", "hue"),
        parse: /*@__PURE__*/ splitColor("hue", "saturation", "lightness"),
        transform: ({ hue, saturation, lightness, alpha: alpha$1 = 1 }) => {
            return ("hsla(" +
                Math.round(hue) +
                ", " +
                percent.transform(sanitize(saturation)) +
                ", " +
                percent.transform(sanitize(lightness)) +
                ", " +
                sanitize(alpha.transform(alpha$1)) +
                ")");
        },
    };

    const color = {
        test: (v) => rgba.test(v) || hex.test(v) || hsla.test(v),
        parse: (v) => {
            if (rgba.test(v)) {
                return rgba.parse(v);
            }
            else if (hsla.test(v)) {
                return hsla.parse(v);
            }
            else {
                return hex.parse(v);
            }
        },
        transform: (v) => {
            return typeof v === "string"
                ? v
                : v.hasOwnProperty("red")
                    ? rgba.transform(v)
                    : hsla.transform(v);
        },
    };

    const colorRegex = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;

    function test(v) {
        var _a, _b;
        return (isNaN(v) &&
            typeof v === "string" &&
            (((_a = v.match(floatRegex)) === null || _a === undefined ? undefined : _a.length) || 0) +
                (((_b = v.match(colorRegex)) === null || _b === undefined ? undefined : _b.length) || 0) >
                0);
    }
    const NUMBER_TOKEN = "number";
    const COLOR_TOKEN = "color";
    const VAR_TOKEN = "var";
    const VAR_FUNCTION_TOKEN = "var(";
    const SPLIT_TOKEN = "${}";
    // this regex consists of the `singleCssVariableRegex|rgbHSLValueRegex|digitRegex`
    const complexRegex = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
    function analyseComplexValue(value) {
        const originalValue = value.toString();
        const values = [];
        const indexes = {
            color: [],
            number: [],
            var: [],
        };
        const types = [];
        let i = 0;
        const tokenised = originalValue.replace(complexRegex, (parsedValue) => {
            if (color.test(parsedValue)) {
                indexes.color.push(i);
                types.push(COLOR_TOKEN);
                values.push(color.parse(parsedValue));
            }
            else if (parsedValue.startsWith(VAR_FUNCTION_TOKEN)) {
                indexes.var.push(i);
                types.push(VAR_TOKEN);
                values.push(parsedValue);
            }
            else {
                indexes.number.push(i);
                types.push(NUMBER_TOKEN);
                values.push(parseFloat(parsedValue));
            }
            ++i;
            return SPLIT_TOKEN;
        });
        const split = tokenised.split(SPLIT_TOKEN);
        return { values, split, indexes, types };
    }
    function parseComplexValue(v) {
        return analyseComplexValue(v).values;
    }
    function createTransformer(source) {
        const { split, types } = analyseComplexValue(source);
        const numSections = split.length;
        return (v) => {
            let output = "";
            for (let i = 0; i < numSections; i++) {
                output += split[i];
                if (v[i] !== undefined) {
                    const type = types[i];
                    if (type === NUMBER_TOKEN) {
                        output += sanitize(v[i]);
                    }
                    else if (type === COLOR_TOKEN) {
                        output += color.transform(v[i]);
                    }
                    else {
                        output += v[i];
                    }
                }
            }
            return output;
        };
    }
    const convertNumbersToZero = (v) => typeof v === "number" ? 0 : v;
    function getAnimatableNone$1(v) {
        const parsed = parseComplexValue(v);
        const transformer = createTransformer(v);
        return transformer(parsed.map(convertNumbersToZero));
    }
    const complex = {
        test,
        parse: parseComplexValue,
        createTransformer,
        getAnimatableNone: getAnimatableNone$1,
    };

    /**
     * Properties that should default to 1 or 100%
     */
    const maxDefaults = new Set(["brightness", "contrast", "saturate", "opacity"]);
    function applyDefaultFilter(v) {
        const [name, value] = v.slice(0, -1).split("(");
        if (name === "drop-shadow")
            return v;
        const [number] = value.match(floatRegex) || [];
        if (!number)
            return v;
        const unit = value.replace(number, "");
        let defaultValue = maxDefaults.has(name) ? 1 : 0;
        if (number !== value)
            defaultValue *= 100;
        return name + "(" + defaultValue + unit + ")";
    }
    const functionRegex = /\b([a-z-]*)\(.*?\)/gu;
    const filter = {
        ...complex,
        getAnimatableNone: (v) => {
            const functions = v.match(functionRegex);
            return functions ? functions.map(applyDefaultFilter).join(" ") : v;
        },
    };

    const browserNumberValueTypes = {
        // Border props
        borderWidth: px,
        borderTopWidth: px,
        borderRightWidth: px,
        borderBottomWidth: px,
        borderLeftWidth: px,
        borderRadius: px,
        radius: px,
        borderTopLeftRadius: px,
        borderTopRightRadius: px,
        borderBottomRightRadius: px,
        borderBottomLeftRadius: px,
        // Positioning props
        width: px,
        maxWidth: px,
        height: px,
        maxHeight: px,
        top: px,
        right: px,
        bottom: px,
        left: px,
        // Spacing props
        padding: px,
        paddingTop: px,
        paddingRight: px,
        paddingBottom: px,
        paddingLeft: px,
        margin: px,
        marginTop: px,
        marginRight: px,
        marginBottom: px,
        marginLeft: px,
        // Misc
        backgroundPositionX: px,
        backgroundPositionY: px,
    };

    const transformValueTypes = {
        rotate: degrees,
        rotateX: degrees,
        rotateY: degrees,
        rotateZ: degrees,
        scale,
        scaleX: scale,
        scaleY: scale,
        scaleZ: scale,
        skew: degrees,
        skewX: degrees,
        skewY: degrees,
        distance: px,
        translateX: px,
        translateY: px,
        translateZ: px,
        x: px,
        y: px,
        z: px,
        perspective: px,
        transformPerspective: px,
        opacity: alpha,
        originX: progressPercentage,
        originY: progressPercentage,
        originZ: px,
    };

    const int = {
        ...number,
        transform: Math.round,
    };

    const numberValueTypes = {
        ...browserNumberValueTypes,
        ...transformValueTypes,
        zIndex: int,
        size: px,
        // SVG
        fillOpacity: alpha,
        strokeOpacity: alpha,
        numOctaves: int,
    };

    /**
     * A map of default value types for common values
     */
    const defaultValueTypes = {
        ...numberValueTypes,
        // Color props
        color,
        backgroundColor: color,
        outlineColor: color,
        fill: color,
        stroke: color,
        // Border props
        borderColor: color,
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: color,
        borderLeftColor: color,
        filter,
        WebkitFilter: filter,
    };
    /**
     * Gets the default ValueType for the provided value key
     */
    const getDefaultValueType = (key) => defaultValueTypes[key];

    function getAnimatableNone(key, value) {
        let defaultValueType = getDefaultValueType(key);
        if (defaultValueType !== filter)
            defaultValueType = complex;
        // If value is not recognised as animatable, ie "none", create an animatable version origin based on the target
        return defaultValueType.getAnimatableNone
            ? defaultValueType.getAnimatableNone(value)
            : undefined;
    }

    /**
     * If we encounter keyframes like "none" or "0" and we also have keyframes like
     * "#fff" or "200px 200px" we want to find a keyframe to serve as a template for
     * the "none" keyframes. In this case "#fff" or "200px 200px" - then these get turned into
     * zero equivalents, i.e. "#fff0" or "0px 0px".
     */
    const invalidTemplates = new Set(["auto", "none", "0"]);
    function makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name) {
        let i = 0;
        let animatableTemplate = undefined;
        while (i < unresolvedKeyframes.length && !animatableTemplate) {
            const keyframe = unresolvedKeyframes[i];
            if (typeof keyframe === "string" &&
                !invalidTemplates.has(keyframe) &&
                analyseComplexValue(keyframe).values.length) {
                animatableTemplate = unresolvedKeyframes[i];
            }
            i++;
        }
        if (animatableTemplate && name) {
            for (const noneIndex of noneKeyframeIndexes) {
                unresolvedKeyframes[noneIndex] = getAnimatableNone(name, animatableTemplate);
            }
        }
    }

    const isNumOrPxType = (v) => v === number || v === px;
    const getPosFromMatrix = (matrix, pos) => parseFloat(matrix.split(", ")[pos]);
    const getTranslateFromMatrix = (pos2, pos3) => (_bbox, { transform }) => {
        if (transform === "none" || !transform)
            return 0;
        const matrix3d = transform.match(/^matrix3d\((.+)\)$/u);
        if (matrix3d) {
            return getPosFromMatrix(matrix3d[1], pos3);
        }
        else {
            const matrix = transform.match(/^matrix\((.+)\)$/u);
            if (matrix) {
                return getPosFromMatrix(matrix[1], pos2);
            }
            else {
                return 0;
            }
        }
    };
    const transformKeys = new Set(["x", "y", "z"]);
    const nonTranslationalTransformKeys = transformPropOrder.filter((key) => !transformKeys.has(key));
    function removeNonTranslationalTransform(visualElement) {
        const removedTransforms = [];
        nonTranslationalTransformKeys.forEach((key) => {
            const value = visualElement.getValue(key);
            if (value !== undefined) {
                removedTransforms.push([key, value.get()]);
                value.set(key.startsWith("scale") ? 1 : 0);
            }
        });
        return removedTransforms;
    }
    const positionalValues = {
        // Dimensions
        width: ({ x }, { paddingLeft = "0", paddingRight = "0" }) => x.max - x.min - parseFloat(paddingLeft) - parseFloat(paddingRight),
        height: ({ y }, { paddingTop = "0", paddingBottom = "0" }) => y.max - y.min - parseFloat(paddingTop) - parseFloat(paddingBottom),
        top: (_bbox, { top }) => parseFloat(top),
        left: (_bbox, { left }) => parseFloat(left),
        bottom: ({ y }, { top }) => parseFloat(top) + (y.max - y.min),
        right: ({ x }, { left }) => parseFloat(left) + (x.max - x.min),
        // Transform
        x: getTranslateFromMatrix(4, 13),
        y: getTranslateFromMatrix(5, 14),
    };
    // Alias translate longform names
    positionalValues.translateX = positionalValues.x;
    positionalValues.translateY = positionalValues.y;

    const toResolve = new Set();
    let isScheduled = false;
    let anyNeedsMeasurement = false;
    function measureAllKeyframes() {
        if (anyNeedsMeasurement) {
            const resolversToMeasure = Array.from(toResolve).filter((resolver) => resolver.needsMeasurement);
            const elementsToMeasure = new Set(resolversToMeasure.map((resolver) => resolver.element));
            const transformsToRestore = new Map();
            /**
             * Write pass
             * If we're measuring elements we want to remove bounding box-changing transforms.
             */
            elementsToMeasure.forEach((element) => {
                const removedTransforms = removeNonTranslationalTransform(element);
                if (!removedTransforms.length)
                    return;
                transformsToRestore.set(element, removedTransforms);
                element.render();
            });
            // Read
            resolversToMeasure.forEach((resolver) => resolver.measureInitialState());
            // Write
            elementsToMeasure.forEach((element) => {
                element.render();
                const restore = transformsToRestore.get(element);
                if (restore) {
                    restore.forEach(([key, value]) => {
                        var _a;
                        (_a = element.getValue(key)) === null || _a === undefined ? undefined : _a.set(value);
                    });
                }
            });
            // Read
            resolversToMeasure.forEach((resolver) => resolver.measureEndState());
            // Write
            resolversToMeasure.forEach((resolver) => {
                if (resolver.suspendedScrollY !== undefined) {
                    window.scrollTo(0, resolver.suspendedScrollY);
                }
            });
        }
        anyNeedsMeasurement = false;
        isScheduled = false;
        toResolve.forEach((resolver) => resolver.complete());
        toResolve.clear();
    }
    function readAllKeyframes() {
        toResolve.forEach((resolver) => {
            resolver.readKeyframes();
            if (resolver.needsMeasurement) {
                anyNeedsMeasurement = true;
            }
        });
    }
    function flushKeyframeResolvers() {
        readAllKeyframes();
        measureAllKeyframes();
    }
    class KeyframeResolver {
        constructor(unresolvedKeyframes, onComplete, name, motionValue, element, isAsync = false) {
            /**
             * Track whether this resolver has completed. Once complete, it never
             * needs to attempt keyframe resolution again.
             */
            this.isComplete = false;
            /**
             * Track whether this resolver is async. If it is, it'll be added to the
             * resolver queue and flushed in the next frame. Resolvers that aren't going
             * to trigger read/write thrashing don't need to be async.
             */
            this.isAsync = false;
            /**
             * Track whether this resolver needs to perform a measurement
             * to resolve its keyframes.
             */
            this.needsMeasurement = false;
            /**
             * Track whether this resolver is currently scheduled to resolve
             * to allow it to be cancelled and resumed externally.
             */
            this.isScheduled = false;
            this.unresolvedKeyframes = [...unresolvedKeyframes];
            this.onComplete = onComplete;
            this.name = name;
            this.motionValue = motionValue;
            this.element = element;
            this.isAsync = isAsync;
        }
        scheduleResolve() {
            this.isScheduled = true;
            if (this.isAsync) {
                toResolve.add(this);
                if (!isScheduled) {
                    isScheduled = true;
                    frame.read(readAllKeyframes);
                    frame.resolveKeyframes(measureAllKeyframes);
                }
            }
            else {
                this.readKeyframes();
                this.complete();
            }
        }
        readKeyframes() {
            const { unresolvedKeyframes, name, element, motionValue } = this;
            /**
             * If a keyframe is null, we hydrate it either by reading it from
             * the instance, or propagating from previous keyframes.
             */
            for (let i = 0; i < unresolvedKeyframes.length; i++) {
                if (unresolvedKeyframes[i] === null) {
                    /**
                     * If the first keyframe is null, we need to find its value by sampling the element
                     */
                    if (i === 0) {
                        const currentValue = motionValue === null || motionValue === undefined ? undefined : motionValue.get();
                        const finalKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
                        if (currentValue !== undefined) {
                            unresolvedKeyframes[0] = currentValue;
                        }
                        else if (element && name) {
                            const valueAsRead = element.readValue(name, finalKeyframe);
                            if (valueAsRead !== undefined && valueAsRead !== null) {
                                unresolvedKeyframes[0] = valueAsRead;
                            }
                        }
                        if (unresolvedKeyframes[0] === undefined) {
                            unresolvedKeyframes[0] = finalKeyframe;
                        }
                        if (motionValue && currentValue === undefined) {
                            motionValue.set(unresolvedKeyframes[0]);
                        }
                    }
                    else {
                        unresolvedKeyframes[i] = unresolvedKeyframes[i - 1];
                    }
                }
            }
        }
        setFinalKeyframe() { }
        measureInitialState() { }
        renderEndStyles() { }
        measureEndState() { }
        complete() {
            this.isComplete = true;
            this.onComplete(this.unresolvedKeyframes, this.finalKeyframe);
            toResolve.delete(this);
        }
        cancel() {
            if (!this.isComplete) {
                this.isScheduled = false;
                toResolve.delete(this);
            }
        }
        resume() {
            if (!this.isComplete)
                this.scheduleResolve();
        }
    }

    /**
     * Check if value is a numerical string, ie a string that is purely a number eg "100" or "-100.1"
     */
    const isNumericalString = (v) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(v);

    const checkStringStartsWith = (token) => (key) => typeof key === "string" && key.startsWith(token);
    const isCSSVariableName = 
    /*@__PURE__*/ checkStringStartsWith("--");
    const startsAsVariableToken = 
    /*@__PURE__*/ checkStringStartsWith("var(--");
    const isCSSVariableToken = (value) => {
        const startsWithToken = startsAsVariableToken(value);
        if (!startsWithToken)
            return false;
        // Ensure any comments are stripped from the value as this can harm performance of the regex.
        return singleCssVariableRegex.test(value.split("/*")[0].trim());
    };
    const singleCssVariableRegex = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;

    /**
     * Parse Framer's special CSS variable format into a CSS token and a fallback.
     *
     * ```
     * `var(--foo, #fff)` => [`--foo`, '#fff']
     * ```
     *
     * @param current
     */
    const splitCSSVariableRegex = 
    // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
    /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;
    function parseCSSVariable(current) {
        const match = splitCSSVariableRegex.exec(current);
        if (!match)
            return [,];
        const [, token1, token2, fallback] = match;
        return [`--${token1 !== null && token1 !== undefined ? token1 : token2}`, fallback];
    }
    function getVariableValue(current, element, depth = 1) {
        const [token, fallback] = parseCSSVariable(current);
        // No CSS variable detected
        if (!token)
            return;
        // Attempt to read this CSS variable off the element
        const resolved = window.getComputedStyle(element).getPropertyValue(token);
        if (resolved) {
            const trimmed = resolved.trim();
            return isNumericalString(trimmed) ? parseFloat(trimmed) : trimmed;
        }
        return isCSSVariableToken(fallback)
            ? getVariableValue(fallback, element, depth + 1)
            : fallback;
    }

    /**
     * Tests a provided value against a ValueType
     */
    const testValueType = (v) => (type) => type.test(v);

    /**
     * ValueType for "auto"
     */
    const auto = {
        test: (v) => v === "auto",
        parse: (v) => v,
    };

    /**
     * A list of value types commonly used for dimensions
     */
    const dimensionValueTypes = [number, px, percent, degrees, vw, vh, auto];
    /**
     * Tests a dimensional value against the list of dimension ValueTypes
     */
    const findDimensionValueType = (v) => dimensionValueTypes.find(testValueType(v));

    class DOMKeyframesResolver extends KeyframeResolver {
        constructor(unresolvedKeyframes, onComplete, name, motionValue, element) {
            super(unresolvedKeyframes, onComplete, name, motionValue, element, true);
        }
        readKeyframes() {
            const { unresolvedKeyframes, element, name } = this;
            if (!element || !element.current)
                return;
            super.readKeyframes();
            /**
             * If any keyframe is a CSS variable, we need to find its value by sampling the element
             */
            for (let i = 0; i < unresolvedKeyframes.length; i++) {
                let keyframe = unresolvedKeyframes[i];
                if (typeof keyframe === "string") {
                    keyframe = keyframe.trim();
                    if (isCSSVariableToken(keyframe)) {
                        const resolved = getVariableValue(keyframe, element.current);
                        if (resolved !== undefined) {
                            unresolvedKeyframes[i] = resolved;
                        }
                        if (i === unresolvedKeyframes.length - 1) {
                            this.finalKeyframe = keyframe;
                        }
                    }
                }
            }
            /**
             * Resolve "none" values. We do this potentially twice - once before and once after measuring keyframes.
             * This could be seen as inefficient but it's a trade-off to avoid measurements in more situations, which
             * have a far bigger performance impact.
             */
            this.resolveNoneKeyframes();
            /**
             * Check to see if unit type has changed. If so schedule jobs that will
             * temporarily set styles to the destination keyframes.
             * Skip if we have more than two keyframes or this isn't a positional value.
             * TODO: We can throw if there are multiple keyframes and the value type changes.
             */
            if (!positionalKeys.has(name) || unresolvedKeyframes.length !== 2) {
                return;
            }
            const [origin, target] = unresolvedKeyframes;
            const originType = findDimensionValueType(origin);
            const targetType = findDimensionValueType(target);
            /**
             * Either we don't recognise these value types or we can animate between them.
             */
            if (originType === targetType)
                return;
            /**
             * If both values are numbers or pixels, we can animate between them by
             * converting them to numbers.
             */
            if (isNumOrPxType(originType) && isNumOrPxType(targetType)) {
                for (let i = 0; i < unresolvedKeyframes.length; i++) {
                    const value = unresolvedKeyframes[i];
                    if (typeof value === "string") {
                        unresolvedKeyframes[i] = parseFloat(value);
                    }
                }
            }
            else {
                /**
                 * Else, the only way to resolve this is by measuring the element.
                 */
                this.needsMeasurement = true;
            }
        }
        resolveNoneKeyframes() {
            const { unresolvedKeyframes, name } = this;
            const noneKeyframeIndexes = [];
            for (let i = 0; i < unresolvedKeyframes.length; i++) {
                if (isNone(unresolvedKeyframes[i])) {
                    noneKeyframeIndexes.push(i);
                }
            }
            if (noneKeyframeIndexes.length) {
                makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name);
            }
        }
        measureInitialState() {
            const { element, unresolvedKeyframes, name } = this;
            if (!element || !element.current)
                return;
            if (name === "height") {
                this.suspendedScrollY = window.pageYOffset;
            }
            this.measuredOrigin = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
            unresolvedKeyframes[0] = this.measuredOrigin;
            // Set final key frame to measure after next render
            const measureKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
            if (measureKeyframe !== undefined) {
                element.getValue(name, measureKeyframe).jump(measureKeyframe, false);
            }
        }
        measureEndState() {
            var _a;
            const { element, name, unresolvedKeyframes } = this;
            if (!element || !element.current)
                return;
            const value = element.getValue(name);
            value && value.jump(this.measuredOrigin, false);
            const finalKeyframeIndex = unresolvedKeyframes.length - 1;
            const finalKeyframe = unresolvedKeyframes[finalKeyframeIndex];
            unresolvedKeyframes[finalKeyframeIndex] = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
            if (finalKeyframe !== null && this.finalKeyframe === undefined) {
                this.finalKeyframe = finalKeyframe;
            }
            // If we removed transform values, reapply them before the next render
            if ((_a = this.removedTransforms) === null || _a === undefined ? undefined : _a.length) {
                this.removedTransforms.forEach(([unsetTransformName, unsetTransformValue]) => {
                    element
                        .getValue(unsetTransformName)
                        .set(unsetTransformValue);
                });
            }
            this.resolveNoneKeyframes();
        }
    }

    /**
     * Check if a value is animatable. Examples:
     *
     * ✅: 100, "100px", "#fff"
     * ❌: "block", "url(2.jpg)"
     * @param value
     *
     * @internal
     */
    const isAnimatable = (value, name) => {
        // If the list of keys tat might be non-animatable grows, replace with Set
        if (name === "zIndex")
            return false;
        // If it's a number or a keyframes array, we can animate it. We might at some point
        // need to do a deep isAnimatable check of keyframes, or let Popmotion handle this,
        // but for now lets leave it like this for performance reasons
        if (typeof value === "number" || Array.isArray(value))
            return true;
        if (typeof value === "string" && // It's animatable if we have a string
            (complex.test(value) || value === "0") && // And it contains numbers and/or colors
            !value.startsWith("url(") // Unless it starts with "url("
        ) {
            return true;
        }
        return false;
    };

    function hasKeyframesChanged(keyframes) {
        const current = keyframes[0];
        if (keyframes.length === 1)
            return true;
        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i] !== current)
                return true;
        }
    }
    function canAnimate(keyframes, name, type, velocity) {
        /**
         * Check if we're able to animate between the start and end keyframes,
         * and throw a warning if we're attempting to animate between one that's
         * animatable and another that isn't.
         */
        const originKeyframe = keyframes[0];
        if (originKeyframe === null)
            return false;
        /**
         * These aren't traditionally animatable but we do support them.
         * In future we could look into making this more generic or replacing
         * this function with mix() === mixImmediate
         */
        if (name === "display" || name === "visibility")
            return true;
        const targetKeyframe = keyframes[keyframes.length - 1];
        const isOriginAnimatable = isAnimatable(originKeyframe, name);
        const isTargetAnimatable = isAnimatable(targetKeyframe, name);
        // Always skip if any of these are true
        if (!isOriginAnimatable || !isTargetAnimatable) {
            return false;
        }
        return (hasKeyframesChanged(keyframes) ||
            ((type === "spring" || isGenerator(type)) && velocity));
    }

    const isNotNull = (value) => value !== null;
    function getFinalKeyframe(keyframes, { repeat, repeatType = "loop" }, finalKeyframe) {
        const resolvedKeyframes = keyframes.filter(isNotNull);
        const index = repeat && repeatType !== "loop" && repeat % 2 === 1
            ? 0
            : resolvedKeyframes.length - 1;
        return !index || finalKeyframe === undefined
            ? resolvedKeyframes[index]
            : finalKeyframe;
    }

    /**
     * Maximum time allowed between an animation being created and it being
     * resolved for us to use the latter as the start time.
     *
     * This is to ensure that while we prefer to "start" an animation as soon
     * as it's triggered, we also want to avoid a visual jump if there's a big delay
     * between these two moments.
     */
    const MAX_RESOLVE_DELAY = 40;
    class BaseAnimation {
        constructor({ autoplay = true, delay = 0, type = "keyframes", repeat = 0, repeatDelay = 0, repeatType = "loop", ...options }) {
            // Track whether the animation has been stopped. Stopped animations won't restart.
            this.isStopped = false;
            this.hasAttemptedResolve = false;
            this.createdAt = time.now();
            this.options = {
                autoplay,
                delay,
                type,
                repeat,
                repeatDelay,
                repeatType,
                ...options,
            };
            this.updateFinishedPromise();
        }
        /**
         * This method uses the createdAt and resolvedAt to calculate the
         * animation startTime. *Ideally*, we would use the createdAt time as t=0
         * as the following frame would then be the first frame of the animation in
         * progress, which would feel snappier.
         *
         * However, if there's a delay (main thread work) between the creation of
         * the animation and the first commited frame, we prefer to use resolvedAt
         * to avoid a sudden jump into the animation.
         */
        calcStartTime() {
            if (!this.resolvedAt)
                return this.createdAt;
            return this.resolvedAt - this.createdAt > MAX_RESOLVE_DELAY
                ? this.resolvedAt
                : this.createdAt;
        }
        /**
         * A getter for resolved data. If keyframes are not yet resolved, accessing
         * this.resolved will synchronously flush all pending keyframe resolvers.
         * This is a deoptimisation, but at its worst still batches read/writes.
         */
        get resolved() {
            if (!this._resolved && !this.hasAttemptedResolve) {
                flushKeyframeResolvers();
            }
            return this._resolved;
        }
        /**
         * A method to be called when the keyframes resolver completes. This method
         * will check if its possible to run the animation and, if not, skip it.
         * Otherwise, it will call initPlayback on the implementing class.
         */
        onKeyframesResolved(keyframes, finalKeyframe) {
            this.resolvedAt = time.now();
            this.hasAttemptedResolve = true;
            const { name, type, velocity, delay, onComplete, onUpdate, isGenerator, } = this.options;
            /**
             * If we can't animate this value with the resolved keyframes
             * then we should complete it immediately.
             */
            if (!isGenerator && !canAnimate(keyframes, name, type, velocity)) {
                // Finish immediately
                if (!delay) {
                    onUpdate &&
                        onUpdate(getFinalKeyframe(keyframes, this.options, finalKeyframe));
                    onComplete && onComplete();
                    this.resolveFinishedPromise();
                    return;
                }
                // Finish after a delay
                else {
                    this.options.duration = 0;
                }
            }
            const resolvedAnimation = this.initPlayback(keyframes, finalKeyframe);
            if (resolvedAnimation === false)
                return;
            this._resolved = {
                keyframes,
                finalKeyframe,
                ...resolvedAnimation,
            };
            this.onPostResolved();
        }
        onPostResolved() { }
        /**
         * Allows the returned animation to be awaited or promise-chained. Currently
         * resolves when the animation finishes at all but in a future update could/should
         * reject if its cancels.
         */
        then(resolve, reject) {
            return this.currentFinishedPromise.then(resolve, reject);
        }
        flatten() {
            this.options.type = "keyframes";
            this.options.ease = "linear";
        }
        updateFinishedPromise() {
            this.currentFinishedPromise = new Promise((resolve) => {
                this.resolveFinishedPromise = resolve;
            });
        }
    }

    // Adapted from https://gist.github.com/mjackson/5311256
    function hueToRgb(p, q, t) {
        if (t < 0)
            t += 1;
        if (t > 1)
            t -= 1;
        if (t < 1 / 6)
            return p + (q - p) * 6 * t;
        if (t < 1 / 2)
            return q;
        if (t < 2 / 3)
            return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    function hslaToRgba({ hue, saturation, lightness, alpha }) {
        hue /= 360;
        saturation /= 100;
        lightness /= 100;
        let red = 0;
        let green = 0;
        let blue = 0;
        if (!saturation) {
            red = green = blue = lightness;
        }
        else {
            const q = lightness < 0.5
                ? lightness * (1 + saturation)
                : lightness + saturation - lightness * saturation;
            const p = 2 * lightness - q;
            red = hueToRgb(p, q, hue + 1 / 3);
            green = hueToRgb(p, q, hue);
            blue = hueToRgb(p, q, hue - 1 / 3);
        }
        return {
            red: Math.round(red * 255),
            green: Math.round(green * 255),
            blue: Math.round(blue * 255),
            alpha,
        };
    }

    function mixImmediate(a, b) {
        return (p) => (p > 0 ? b : a);
    }

    // Linear color space blending
    // Explained https://www.youtube.com/watch?v=LKnqECcg6Gw
    // Demonstrated http://codepen.io/osublake/pen/xGVVaN
    const mixLinearColor = (from, to, v) => {
        const fromExpo = from * from;
        const expo = v * (to * to - fromExpo) + fromExpo;
        return expo < 0 ? 0 : Math.sqrt(expo);
    };
    const colorTypes = [hex, rgba, hsla];
    const getColorType = (v) => colorTypes.find((type) => type.test(v));
    function asRGBA(color) {
        const type = getColorType(color);
        if (!Boolean(type))
            return false;
        let model = type.parse(color);
        if (type === hsla) {
            // TODO Remove this cast - needed since Motion's stricter typing
            model = hslaToRgba(model);
        }
        return model;
    }
    const mixColor = (from, to) => {
        const fromRGBA = asRGBA(from);
        const toRGBA = asRGBA(to);
        if (!fromRGBA || !toRGBA) {
            return mixImmediate(from, to);
        }
        const blended = { ...fromRGBA };
        return (v) => {
            blended.red = mixLinearColor(fromRGBA.red, toRGBA.red, v);
            blended.green = mixLinearColor(fromRGBA.green, toRGBA.green, v);
            blended.blue = mixLinearColor(fromRGBA.blue, toRGBA.blue, v);
            blended.alpha = mixNumber$1(fromRGBA.alpha, toRGBA.alpha, v);
            return rgba.transform(blended);
        };
    };

    /**
     * Pipe
     * Compose other transformers to run linearily
     * pipe(min(20), max(40))
     * @param  {...functions} transformers
     * @return {function}
     */
    const combineFunctions = (a, b) => (v) => b(a(v));
    const pipe = (...transformers) => transformers.reduce(combineFunctions);

    const invisibleValues = new Set(["none", "hidden"]);
    /**
     * Returns a function that, when provided a progress value between 0 and 1,
     * will return the "none" or "hidden" string only when the progress is that of
     * the origin or target.
     */
    function mixVisibility(origin, target) {
        if (invisibleValues.has(origin)) {
            return (p) => (p <= 0 ? origin : target);
        }
        else {
            return (p) => (p >= 1 ? target : origin);
        }
    }

    function mixNumber(a, b) {
        return (p) => mixNumber$1(a, b, p);
    }
    function getMixer(a) {
        if (typeof a === "number") {
            return mixNumber;
        }
        else if (typeof a === "string") {
            return isCSSVariableToken(a)
                ? mixImmediate
                : color.test(a)
                    ? mixColor
                    : mixComplex;
        }
        else if (Array.isArray(a)) {
            return mixArray;
        }
        else if (typeof a === "object") {
            return color.test(a) ? mixColor : mixObject;
        }
        return mixImmediate;
    }
    function mixArray(a, b) {
        const output = [...a];
        const numValues = output.length;
        const blendValue = a.map((v, i) => getMixer(v)(v, b[i]));
        return (p) => {
            for (let i = 0; i < numValues; i++) {
                output[i] = blendValue[i](p);
            }
            return output;
        };
    }
    function mixObject(a, b) {
        const output = { ...a, ...b };
        const blendValue = {};
        for (const key in output) {
            if (a[key] !== undefined && b[key] !== undefined) {
                blendValue[key] = getMixer(a[key])(a[key], b[key]);
            }
        }
        return (v) => {
            for (const key in blendValue) {
                output[key] = blendValue[key](v);
            }
            return output;
        };
    }
    function matchOrder(origin, target) {
        var _a;
        const orderedOrigin = [];
        const pointers = { color: 0, var: 0, number: 0 };
        for (let i = 0; i < target.values.length; i++) {
            const type = target.types[i];
            const originIndex = origin.indexes[type][pointers[type]];
            const originValue = (_a = origin.values[originIndex]) !== null && _a !== undefined ? _a : 0;
            orderedOrigin[i] = originValue;
            pointers[type]++;
        }
        return orderedOrigin;
    }
    const mixComplex = (origin, target) => {
        const template = complex.createTransformer(target);
        const originStats = analyseComplexValue(origin);
        const targetStats = analyseComplexValue(target);
        const canInterpolate = originStats.indexes.var.length === targetStats.indexes.var.length &&
            originStats.indexes.color.length === targetStats.indexes.color.length &&
            originStats.indexes.number.length >= targetStats.indexes.number.length;
        if (canInterpolate) {
            if ((invisibleValues.has(origin) &&
                !targetStats.values.length) ||
                (invisibleValues.has(target) &&
                    !originStats.values.length)) {
                return mixVisibility(origin, target);
            }
            return pipe(mixArray(matchOrder(originStats, targetStats), targetStats.values), template);
        }
        else {
            return mixImmediate(origin, target);
        }
    };

    function mix(from, to, p) {
        if (typeof from === "number" &&
            typeof to === "number" &&
            typeof p === "number") {
            return mixNumber$1(from, to, p);
        }
        const mixer = getMixer(from);
        return mixer(from, to);
    }

    function inertia({ keyframes, velocity = 0.0, power = 0.8, timeConstant = 325, bounceDamping = 10, bounceStiffness = 500, modifyTarget, min, max, restDelta = 0.5, restSpeed, }) {
        const origin = keyframes[0];
        const state = {
            done: false,
            value: origin,
        };
        const isOutOfBounds = (v) => (min !== undefined && v < min) || (max !== undefined && v > max);
        const nearestBoundary = (v) => {
            if (min === undefined)
                return max;
            if (max === undefined)
                return min;
            return Math.abs(min - v) < Math.abs(max - v) ? min : max;
        };
        let amplitude = power * velocity;
        const ideal = origin + amplitude;
        const target = modifyTarget === undefined ? ideal : modifyTarget(ideal);
        /**
         * If the target has changed we need to re-calculate the amplitude, otherwise
         * the animation will start from the wrong position.
         */
        if (target !== ideal)
            amplitude = target - origin;
        const calcDelta = (t) => -amplitude * Math.exp(-t / timeConstant);
        const calcLatest = (t) => target + calcDelta(t);
        const applyFriction = (t) => {
            const delta = calcDelta(t);
            const latest = calcLatest(t);
            state.done = Math.abs(delta) <= restDelta;
            state.value = state.done ? target : latest;
        };
        /**
         * Ideally this would resolve for t in a stateless way, we could
         * do that by always precalculating the animation but as we know
         * this will be done anyway we can assume that spring will
         * be discovered during that.
         */
        let timeReachedBoundary;
        let spring$1;
        const checkCatchBoundary = (t) => {
            if (!isOutOfBounds(state.value))
                return;
            timeReachedBoundary = t;
            spring$1 = spring({
                keyframes: [state.value, nearestBoundary(state.value)],
                velocity: calcGeneratorVelocity(calcLatest, t, state.value), // TODO: This should be passing * 1000
                damping: bounceDamping,
                stiffness: bounceStiffness,
                restDelta,
                restSpeed,
            });
        };
        checkCatchBoundary(0);
        return {
            calculatedDuration: null,
            next: (t) => {
                /**
                 * We need to resolve the friction to figure out if we need a
                 * spring but we don't want to do this twice per frame. So here
                 * we flag if we updated for this frame and later if we did
                 * we can skip doing it again.
                 */
                let hasUpdatedFrame = false;
                if (!spring$1 && timeReachedBoundary === undefined) {
                    hasUpdatedFrame = true;
                    applyFriction(t);
                    checkCatchBoundary(t);
                }
                /**
                 * If we have a spring and the provided t is beyond the moment the friction
                 * animation crossed the min/max boundary, use the spring.
                 */
                if (timeReachedBoundary !== undefined && t >= timeReachedBoundary) {
                    return spring$1.next(t - timeReachedBoundary);
                }
                else {
                    !hasUpdatedFrame && applyFriction(t);
                    return state;
                }
            },
        };
    }

    const easeIn = /*@__PURE__*/ cubicBezier(0.42, 0, 1, 1);
    const easeOut = /*@__PURE__*/ cubicBezier(0, 0, 0.58, 1);
    const easeInOut = /*@__PURE__*/ cubicBezier(0.42, 0, 0.58, 1);

    const easingLookup = {
        linear: noop,
        easeIn,
        easeInOut,
        easeOut,
        circIn,
        circInOut,
        circOut,
        backIn,
        backInOut,
        backOut,
        anticipate,
    };
    const easingDefinitionToFunction = (definition) => {
        if (isBezierDefinition(definition)) {
            // If cubic bezier definition, create bezier curve
            invariant(definition.length === 4);
            const [x1, y1, x2, y2] = definition;
            return cubicBezier(x1, y1, x2, y2);
        }
        else if (typeof definition === "string") {
            return easingLookup[definition];
        }
        return definition;
    };

    function createMixers(output, ease, customMixer) {
        const mixers = [];
        const mixerFactory = customMixer || mix;
        const numMixers = output.length - 1;
        for (let i = 0; i < numMixers; i++) {
            let mixer = mixerFactory(output[i], output[i + 1]);
            if (ease) {
                const easingFunction = Array.isArray(ease) ? ease[i] || noop : ease;
                mixer = pipe(easingFunction, mixer);
            }
            mixers.push(mixer);
        }
        return mixers;
    }
    /**
     * Create a function that maps from a numerical input array to a generic output array.
     *
     * Accepts:
     *   - Numbers
     *   - Colors (hex, hsl, hsla, rgb, rgba)
     *   - Complex (combinations of one or more numbers or strings)
     *
     * ```jsx
     * const mixColor = interpolate([0, 1], ['#fff', '#000'])
     *
     * mixColor(0.5) // 'rgba(128, 128, 128, 1)'
     * ```
     *
     * TODO Revist this approach once we've moved to data models for values,
     * probably not needed to pregenerate mixer functions.
     *
     * @public
     */
    function interpolate(input, output, { clamp: isClamp = true, ease, mixer } = {}) {
        const inputLength = input.length;
        invariant(inputLength === output.length);
        /**
         * If we're only provided a single input, we can just make a function
         * that returns the output.
         */
        if (inputLength === 1)
            return () => output[0];
        if (inputLength === 2 && output[0] === output[1])
            return () => output[1];
        const isZeroDeltaRange = input[0] === input[1];
        // If input runs highest -> lowest, reverse both arrays
        if (input[0] > input[inputLength - 1]) {
            input = [...input].reverse();
            output = [...output].reverse();
        }
        const mixers = createMixers(output, ease, mixer);
        const numMixers = mixers.length;
        const interpolator = (v) => {
            if (isZeroDeltaRange && v < input[0])
                return output[0];
            let i = 0;
            if (numMixers > 1) {
                for (; i < input.length - 2; i++) {
                    if (v < input[i + 1])
                        break;
                }
            }
            const progressInRange = progress(input[i], input[i + 1], v);
            return mixers[i](progressInRange);
        };
        return isClamp
            ? (v) => interpolator(clamp(input[0], input[inputLength - 1], v))
            : interpolator;
    }

    function convertOffsetToTimes(offset, duration) {
        return offset.map((o) => o * duration);
    }

    function defaultEasing(values, easing) {
        return values.map(() => easing || easeInOut).splice(0, values.length - 1);
    }
    function keyframes({ duration = 300, keyframes: keyframeValues, times, ease = "easeInOut", }) {
        /**
         * Easing functions can be externally defined as strings. Here we convert them
         * into actual functions.
         */
        const easingFunctions = isEasingArray(ease)
            ? ease.map(easingDefinitionToFunction)
            : easingDefinitionToFunction(ease);
        /**
         * This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
         * to reduce GC during animation.
         */
        const state = {
            done: false,
            value: keyframeValues[0],
        };
        /**
         * Create a times array based on the provided 0-1 offsets
         */
        const absoluteTimes = convertOffsetToTimes(
        // Only use the provided offsets if they're the correct length
        // TODO Maybe we should warn here if there's a length mismatch
        times && times.length === keyframeValues.length
            ? times
            : defaultOffset$1(keyframeValues), duration);
        const mapTimeToKeyframe = interpolate(absoluteTimes, keyframeValues, {
            ease: Array.isArray(easingFunctions)
                ? easingFunctions
                : defaultEasing(keyframeValues, easingFunctions),
        });
        return {
            calculatedDuration: duration,
            next: (t) => {
                state.value = mapTimeToKeyframe(t);
                state.done = t >= duration;
                return state;
            },
        };
    }

    const frameloopDriver = (update) => {
        const passTimestamp = ({ timestamp }) => update(timestamp);
        return {
            start: () => frame.update(passTimestamp, true),
            stop: () => cancelFrame(passTimestamp),
            /**
             * If we're processing this frame we can use the
             * framelocked timestamp to keep things in sync.
             */
            now: () => (frameData.isProcessing ? frameData.timestamp : time.now()),
        };
    };

    const generators = {
        decay: inertia,
        inertia,
        tween: keyframes,
        keyframes: keyframes,
        spring,
    };
    const percentToProgress = (percent) => percent / 100;
    /**
     * Animation that runs on the main thread. Designed to be WAAPI-spec in the subset of
     * features we expose publically. Mostly the compatibility is to ensure visual identity
     * between both WAAPI and main thread animations.
     */
    class MainThreadAnimation extends BaseAnimation {
        constructor(options) {
            super(options);
            /**
             * The time at which the animation was paused.
             */
            this.holdTime = null;
            /**
             * The time at which the animation was cancelled.
             */
            this.cancelTime = null;
            /**
             * The current time of the animation.
             */
            this.currentTime = 0;
            /**
             * Playback speed as a factor. 0 would be stopped, -1 reverse and 2 double speed.
             */
            this.playbackSpeed = 1;
            /**
             * The state of the animation to apply when the animation is resolved. This
             * allows calls to the public API to control the animation before it is resolved,
             * without us having to resolve it first.
             */
            this.pendingPlayState = "running";
            /**
             * The time at which the animation was started.
             */
            this.startTime = null;
            this.state = "idle";
            /**
             * This method is bound to the instance to fix a pattern where
             * animation.stop is returned as a reference from a useEffect.
             */
            this.stop = () => {
                this.resolver.cancel();
                this.isStopped = true;
                if (this.state === "idle")
                    return;
                this.teardown();
                const { onStop } = this.options;
                onStop && onStop();
            };
            const { name, motionValue, element, keyframes } = this.options;
            const KeyframeResolver$1 = (element === null || element === undefined ? undefined : element.KeyframeResolver) || KeyframeResolver;
            const onResolved = (resolvedKeyframes, finalKeyframe) => this.onKeyframesResolved(resolvedKeyframes, finalKeyframe);
            this.resolver = new KeyframeResolver$1(keyframes, onResolved, name, motionValue, element);
            this.resolver.scheduleResolve();
        }
        flatten() {
            super.flatten();
            // If we've already resolved the animation, re-initialise it
            if (this._resolved) {
                Object.assign(this._resolved, this.initPlayback(this._resolved.keyframes));
            }
        }
        initPlayback(keyframes$1) {
            const { type = "keyframes", repeat = 0, repeatDelay = 0, repeatType, velocity = 0, } = this.options;
            const generatorFactory = isGenerator(type)
                ? type
                : generators[type] || keyframes;
            /**
             * If our generator doesn't support mixing numbers, we need to replace keyframes with
             * [0, 100] and then make a function that maps that to the actual keyframes.
             *
             * 100 is chosen instead of 1 as it works nicer with spring animations.
             */
            let mapPercentToKeyframes;
            let mirroredGenerator;
            if (generatorFactory !== keyframes &&
                typeof keyframes$1[0] !== "number") {
                mapPercentToKeyframes = pipe(percentToProgress, mix(keyframes$1[0], keyframes$1[1]));
                keyframes$1 = [0, 100];
            }
            const generator = generatorFactory({ ...this.options, keyframes: keyframes$1 });
            /**
             * If we have a mirror repeat type we need to create a second generator that outputs the
             * mirrored (not reversed) animation and later ping pong between the two generators.
             */
            if (repeatType === "mirror") {
                mirroredGenerator = generatorFactory({
                    ...this.options,
                    keyframes: [...keyframes$1].reverse(),
                    velocity: -velocity,
                });
            }
            /**
             * If duration is undefined and we have repeat options,
             * we need to calculate a duration from the generator.
             *
             * We set it to the generator itself to cache the duration.
             * Any timeline resolver will need to have already precalculated
             * the duration by this step.
             */
            if (generator.calculatedDuration === null) {
                generator.calculatedDuration = calcGeneratorDuration(generator);
            }
            const { calculatedDuration } = generator;
            const resolvedDuration = calculatedDuration + repeatDelay;
            const totalDuration = resolvedDuration * (repeat + 1) - repeatDelay;
            return {
                generator,
                mirroredGenerator,
                mapPercentToKeyframes,
                calculatedDuration,
                resolvedDuration,
                totalDuration,
            };
        }
        onPostResolved() {
            const { autoplay = true } = this.options;
            this.play();
            if (this.pendingPlayState === "paused" || !autoplay) {
                this.pause();
            }
            else {
                this.state = this.pendingPlayState;
            }
        }
        tick(timestamp, sample = false) {
            const { resolved } = this;
            // If the animations has failed to resolve, return the final keyframe.
            if (!resolved) {
                const { keyframes } = this.options;
                return { done: true, value: keyframes[keyframes.length - 1] };
            }
            const { finalKeyframe, generator, mirroredGenerator, mapPercentToKeyframes, keyframes, calculatedDuration, totalDuration, resolvedDuration, } = resolved;
            if (this.startTime === null)
                return generator.next(0);
            const { delay, repeat, repeatType, repeatDelay, onUpdate } = this.options;
            /**
             * requestAnimationFrame timestamps can come through as lower than
             * the startTime as set by performance.now(). Here we prevent this,
             * though in the future it could be possible to make setting startTime
             * a pending operation that gets resolved here.
             */
            if (this.speed > 0) {
                this.startTime = Math.min(this.startTime, timestamp);
            }
            else if (this.speed < 0) {
                this.startTime = Math.min(timestamp - totalDuration / this.speed, this.startTime);
            }
            // Update currentTime
            if (sample) {
                this.currentTime = timestamp;
            }
            else if (this.holdTime !== null) {
                this.currentTime = this.holdTime;
            }
            else {
                // Rounding the time because floating point arithmetic is not always accurate, e.g. 3000.367 - 1000.367 =
                // 2000.0000000000002. This is a problem when we are comparing the currentTime with the duration, for
                // example.
                this.currentTime =
                    Math.round(timestamp - this.startTime) * this.speed;
            }
            // Rebase on delay
            const timeWithoutDelay = this.currentTime - delay * (this.speed >= 0 ? 1 : -1);
            const isInDelayPhase = this.speed >= 0
                ? timeWithoutDelay < 0
                : timeWithoutDelay > totalDuration;
            this.currentTime = Math.max(timeWithoutDelay, 0);
            // If this animation has finished, set the current time  to the total duration.
            if (this.state === "finished" && this.holdTime === null) {
                this.currentTime = totalDuration;
            }
            let elapsed = this.currentTime;
            let frameGenerator = generator;
            if (repeat) {
                /**
                 * Get the current progress (0-1) of the animation. If t is >
                 * than duration we'll get values like 2.5 (midway through the
                 * third iteration)
                 */
                const progress = Math.min(this.currentTime, totalDuration) / resolvedDuration;
                /**
                 * Get the current iteration (0 indexed). For instance the floor of
                 * 2.5 is 2.
                 */
                let currentIteration = Math.floor(progress);
                /**
                 * Get the current progress of the iteration by taking the remainder
                 * so 2.5 is 0.5 through iteration 2
                 */
                let iterationProgress = progress % 1.0;
                /**
                 * If iteration progress is 1 we count that as the end
                 * of the previous iteration.
                 */
                if (!iterationProgress && progress >= 1) {
                    iterationProgress = 1;
                }
                iterationProgress === 1 && currentIteration--;
                currentIteration = Math.min(currentIteration, repeat + 1);
                /**
                 * Reverse progress if we're not running in "normal" direction
                 */
                const isOddIteration = Boolean(currentIteration % 2);
                if (isOddIteration) {
                    if (repeatType === "reverse") {
                        iterationProgress = 1 - iterationProgress;
                        if (repeatDelay) {
                            iterationProgress -= repeatDelay / resolvedDuration;
                        }
                    }
                    else if (repeatType === "mirror") {
                        frameGenerator = mirroredGenerator;
                    }
                }
                elapsed = clamp(0, 1, iterationProgress) * resolvedDuration;
            }
            /**
             * If we're in negative time, set state as the initial keyframe.
             * This prevents delay: x, duration: 0 animations from finishing
             * instantly.
             */
            const state = isInDelayPhase
                ? { done: false, value: keyframes[0] }
                : frameGenerator.next(elapsed);
            if (mapPercentToKeyframes) {
                state.value = mapPercentToKeyframes(state.value);
            }
            let { done } = state;
            if (!isInDelayPhase && calculatedDuration !== null) {
                done =
                    this.speed >= 0
                        ? this.currentTime >= totalDuration
                        : this.currentTime <= 0;
            }
            const isAnimationFinished = this.holdTime === null &&
                (this.state === "finished" || (this.state === "running" && done));
            if (isAnimationFinished && finalKeyframe !== undefined) {
                state.value = getFinalKeyframe(keyframes, this.options, finalKeyframe);
            }
            if (onUpdate) {
                onUpdate(state.value);
            }
            if (isAnimationFinished) {
                this.finish();
            }
            return state;
        }
        get duration() {
            const { resolved } = this;
            return resolved ? millisecondsToSeconds(resolved.calculatedDuration) : 0;
        }
        get time() {
            return millisecondsToSeconds(this.currentTime);
        }
        set time(newTime) {
            newTime = secondsToMilliseconds(newTime);
            this.currentTime = newTime;
            if (this.holdTime !== null || this.speed === 0) {
                this.holdTime = newTime;
            }
            else if (this.driver) {
                this.startTime = this.driver.now() - newTime / this.speed;
            }
        }
        get speed() {
            return this.playbackSpeed;
        }
        set speed(newSpeed) {
            const hasChanged = this.playbackSpeed !== newSpeed;
            this.playbackSpeed = newSpeed;
            if (hasChanged) {
                this.time = millisecondsToSeconds(this.currentTime);
            }
        }
        play() {
            if (!this.resolver.isScheduled) {
                this.resolver.resume();
            }
            if (!this._resolved) {
                this.pendingPlayState = "running";
                return;
            }
            if (this.isStopped)
                return;
            const { driver = frameloopDriver, onPlay, startTime } = this.options;
            if (!this.driver) {
                this.driver = driver((timestamp) => this.tick(timestamp));
            }
            onPlay && onPlay();
            const now = this.driver.now();
            if (this.holdTime !== null) {
                this.startTime = now - this.holdTime;
            }
            else if (!this.startTime) {
                this.startTime = startTime !== null && startTime !== undefined ? startTime : this.calcStartTime();
            }
            else if (this.state === "finished") {
                this.startTime = now;
            }
            if (this.state === "finished") {
                this.updateFinishedPromise();
            }
            this.cancelTime = this.startTime;
            this.holdTime = null;
            /**
             * Set playState to running only after we've used it in
             * the previous logic.
             */
            this.state = "running";
            this.driver.start();
        }
        pause() {
            var _a;
            if (!this._resolved) {
                this.pendingPlayState = "paused";
                return;
            }
            this.state = "paused";
            this.holdTime = (_a = this.currentTime) !== null && _a !== undefined ? _a : 0;
        }
        complete() {
            if (this.state !== "running") {
                this.play();
            }
            this.pendingPlayState = this.state = "finished";
            this.holdTime = null;
        }
        finish() {
            this.teardown();
            this.state = "finished";
            const { onComplete } = this.options;
            onComplete && onComplete();
        }
        cancel() {
            if (this.cancelTime !== null) {
                this.tick(this.cancelTime);
            }
            this.teardown();
            this.updateFinishedPromise();
        }
        teardown() {
            this.state = "idle";
            this.stopDriver();
            this.resolveFinishedPromise();
            this.updateFinishedPromise();
            this.startTime = this.cancelTime = null;
            this.resolver.cancel();
        }
        stopDriver() {
            if (!this.driver)
                return;
            this.driver.stop();
            this.driver = undefined;
        }
        sample(time) {
            this.startTime = 0;
            return this.tick(time, true);
        }
    }

    /**
     * A list of values that can be hardware-accelerated.
     */
    const acceleratedValues = new Set([
        "opacity",
        "clipPath",
        "filter",
        "transform",
        // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
        // or until we implement support for linear() easing.
        // "background-color"
    ]);

    function startWaapiAnimation(element, valueName, keyframes, { delay = 0, duration = 300, repeat = 0, repeatType = "loop", ease = "easeInOut", times, } = {}) {
        const keyframeOptions = { [valueName]: keyframes };
        if (times)
            keyframeOptions.offset = times;
        const easing = mapEasingToNativeEasing(ease, duration);
        /**
         * If this is an easing array, apply to keyframes, not animation as a whole
         */
        if (Array.isArray(easing))
            keyframeOptions.easing = easing;
        return element.animate(keyframeOptions, {
            delay,
            duration,
            easing: !Array.isArray(easing) ? easing : "linear",
            fill: "both",
            iterations: repeat + 1,
            direction: repeatType === "reverse" ? "alternate" : "normal",
        });
    }

    const supportsWaapi = /*@__PURE__*/ memo(() => Object.hasOwnProperty.call(Element.prototype, "animate"));

    /**
     * 10ms is chosen here as it strikes a balance between smooth
     * results (more than one keyframe per frame at 60fps) and
     * keyframe quantity.
     */
    const sampleDelta = 10; //ms
    /**
     * Implement a practical max duration for keyframe generation
     * to prevent infinite loops
     */
    const maxDuration = 20000;
    /**
     * Check if an animation can run natively via WAAPI or requires pregenerated keyframes.
     * WAAPI doesn't support spring or function easings so we run these as JS animation before
     * handing off.
     */
    function requiresPregeneratedKeyframes(options) {
        return (isGenerator(options.type) ||
            options.type === "spring" ||
            !isWaapiSupportedEasing(options.ease));
    }
    function pregenerateKeyframes(keyframes, options) {
        /**
         * Create a main-thread animation to pregenerate keyframes.
         * We sample this at regular intervals to generate keyframes that we then
         * linearly interpolate between.
         */
        const sampleAnimation = new MainThreadAnimation({
            ...options,
            keyframes,
            repeat: 0,
            delay: 0,
            isGenerator: true,
        });
        let state = { done: false, value: keyframes[0] };
        const pregeneratedKeyframes = [];
        /**
         * Bail after 20 seconds of pre-generated keyframes as it's likely
         * we're heading for an infinite loop.
         */
        let t = 0;
        while (!state.done && t < maxDuration) {
            state = sampleAnimation.sample(t);
            pregeneratedKeyframes.push(state.value);
            t += sampleDelta;
        }
        return {
            times: undefined,
            keyframes: pregeneratedKeyframes,
            duration: t - sampleDelta,
            ease: "linear",
        };
    }
    const unsupportedEasingFunctions = {
        anticipate,
        backInOut,
        circInOut,
    };
    function isUnsupportedEase(key) {
        return key in unsupportedEasingFunctions;
    }
    class AcceleratedAnimation extends BaseAnimation {
        constructor(options) {
            super(options);
            const { name, motionValue, element, keyframes } = this.options;
            this.resolver = new DOMKeyframesResolver(keyframes, (resolvedKeyframes, finalKeyframe) => this.onKeyframesResolved(resolvedKeyframes, finalKeyframe), name, motionValue, element);
            this.resolver.scheduleResolve();
        }
        initPlayback(keyframes, finalKeyframe) {
            let { duration = 300, times, ease, type, motionValue, name, startTime, } = this.options;
            /**
             * If element has since been unmounted, return false to indicate
             * the animation failed to initialised.
             */
            if (!motionValue.owner || !motionValue.owner.current) {
                return false;
            }
            /**
             * If the user has provided an easing function name that isn't supported
             * by WAAPI (like "anticipate"), we need to provide the corressponding
             * function. This will later get converted to a linear() easing function.
             */
            if (typeof ease === "string" &&
                supportsLinearEasing() &&
                isUnsupportedEase(ease)) {
                ease = unsupportedEasingFunctions[ease];
            }
            /**
             * If this animation needs pre-generated keyframes then generate.
             */
            if (requiresPregeneratedKeyframes(this.options)) {
                const { onComplete, onUpdate, motionValue, element, ...options } = this.options;
                const pregeneratedAnimation = pregenerateKeyframes(keyframes, options);
                keyframes = pregeneratedAnimation.keyframes;
                // If this is a very short animation, ensure we have
                // at least two keyframes to animate between as older browsers
                // can't animate between a single keyframe.
                if (keyframes.length === 1) {
                    keyframes[1] = keyframes[0];
                }
                duration = pregeneratedAnimation.duration;
                times = pregeneratedAnimation.times;
                ease = pregeneratedAnimation.ease;
                type = "keyframes";
            }
            const animation = startWaapiAnimation(motionValue.owner.current, name, keyframes, { ...this.options, duration, times, ease });
            // Override the browser calculated startTime with one synchronised to other JS
            // and WAAPI animations starting this event loop.
            animation.startTime = startTime !== null && startTime !== undefined ? startTime : this.calcStartTime();
            if (this.pendingTimeline) {
                attachTimeline(animation, this.pendingTimeline);
                this.pendingTimeline = undefined;
            }
            else {
                /**
                 * Prefer the `onfinish` prop as it's more widely supported than
                 * the `finished` promise.
                 *
                 * Here, we synchronously set the provided MotionValue to the end
                 * keyframe. If we didn't, when the WAAPI animation is finished it would
                 * be removed from the element which would then revert to its old styles.
                 */
                animation.onfinish = () => {
                    const { onComplete } = this.options;
                    motionValue.set(getFinalKeyframe(keyframes, this.options, finalKeyframe));
                    onComplete && onComplete();
                    this.cancel();
                    this.resolveFinishedPromise();
                };
            }
            return {
                animation,
                duration,
                times,
                type,
                ease,
                keyframes: keyframes,
            };
        }
        get duration() {
            const { resolved } = this;
            if (!resolved)
                return 0;
            const { duration } = resolved;
            return millisecondsToSeconds(duration);
        }
        get time() {
            const { resolved } = this;
            if (!resolved)
                return 0;
            const { animation } = resolved;
            return millisecondsToSeconds(animation.currentTime || 0);
        }
        set time(newTime) {
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            animation.currentTime = secondsToMilliseconds(newTime);
        }
        get speed() {
            const { resolved } = this;
            if (!resolved)
                return 1;
            const { animation } = resolved;
            return animation.playbackRate;
        }
        set speed(newSpeed) {
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            animation.playbackRate = newSpeed;
        }
        get state() {
            const { resolved } = this;
            if (!resolved)
                return "idle";
            const { animation } = resolved;
            return animation.playState;
        }
        get startTime() {
            const { resolved } = this;
            if (!resolved)
                return null;
            const { animation } = resolved;
            // Coerce to number as TypeScript incorrectly types this
            // as CSSNumberish
            return animation.startTime;
        }
        /**
         * Replace the default DocumentTimeline with another AnimationTimeline.
         * Currently used for scroll animations.
         */
        attachTimeline(timeline) {
            if (!this._resolved) {
                this.pendingTimeline = timeline;
            }
            else {
                const { resolved } = this;
                if (!resolved)
                    return noop;
                const { animation } = resolved;
                attachTimeline(animation, timeline);
            }
            return noop;
        }
        play() {
            if (this.isStopped)
                return;
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            if (animation.playState === "finished") {
                this.updateFinishedPromise();
            }
            animation.play();
        }
        pause() {
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation } = resolved;
            animation.pause();
        }
        stop() {
            this.resolver.cancel();
            this.isStopped = true;
            if (this.state === "idle")
                return;
            this.resolveFinishedPromise();
            this.updateFinishedPromise();
            const { resolved } = this;
            if (!resolved)
                return;
            const { animation, keyframes, duration, type, ease, times } = resolved;
            if (animation.playState === "idle" ||
                animation.playState === "finished") {
                return;
            }
            /**
             * WAAPI doesn't natively have any interruption capabilities.
             *
             * Rather than read commited styles back out of the DOM, we can
             * create a renderless JS animation and sample it twice to calculate
             * its current value, "previous" value, and therefore allow
             * Motion to calculate velocity for any subsequent animation.
             */
            if (this.time) {
                const { motionValue, onUpdate, onComplete, element, ...options } = this.options;
                const sampleAnimation = new MainThreadAnimation({
                    ...options,
                    keyframes,
                    duration,
                    type,
                    ease,
                    times,
                    isGenerator: true,
                });
                const sampleTime = secondsToMilliseconds(this.time);
                motionValue.setWithVelocity(sampleAnimation.sample(sampleTime - sampleDelta).value, sampleAnimation.sample(sampleTime).value, sampleDelta);
            }
            const { onStop } = this.options;
            onStop && onStop();
            this.cancel();
        }
        complete() {
            const { resolved } = this;
            if (!resolved)
                return;
            resolved.animation.finish();
        }
        cancel() {
            const { resolved } = this;
            if (!resolved)
                return;
            resolved.animation.cancel();
        }
        static supports(options) {
            const { motionValue, name, repeatDelay, repeatType, damping, type } = options;
            if (!motionValue ||
                !motionValue.owner ||
                !(motionValue.owner.current instanceof HTMLElement)) {
                return false;
            }
            const { onUpdate, transformTemplate } = motionValue.owner.getProps();
            return (supportsWaapi() &&
                name &&
                acceleratedValues.has(name) &&
                /**
                 * If we're outputting values to onUpdate then we can't use WAAPI as there's
                 * no way to read the value from WAAPI every frame.
                 */
                !onUpdate &&
                !transformTemplate &&
                !repeatDelay &&
                repeatType !== "mirror" &&
                damping !== 0 &&
                type !== "inertia");
        }
    }

    const underDampedSpring = {
        type: "spring",
        stiffness: 500,
        damping: 25,
        restSpeed: 10,
    };
    const criticallyDampedSpring = (target) => ({
        type: "spring",
        stiffness: 550,
        damping: target === 0 ? 2 * Math.sqrt(550) : 30,
        restSpeed: 10,
    });
    const keyframesTransition = {
        type: "keyframes",
        duration: 0.8,
    };
    /**
     * Default easing curve is a slightly shallower version of
     * the default browser easing curve.
     */
    const ease = {
        type: "keyframes",
        ease: [0.25, 0.1, 0.35, 1],
        duration: 0.3,
    };
    const getDefaultTransition = (valueKey, { keyframes }) => {
        if (keyframes.length > 2) {
            return keyframesTransition;
        }
        else if (transformProps.has(valueKey)) {
            return valueKey.startsWith("scale")
                ? criticallyDampedSpring(keyframes[1])
                : underDampedSpring;
        }
        return ease;
    };

    /**
     * Decide whether a transition is defined on a given Transition.
     * This filters out orchestration options and returns true
     * if any options are left.
     */
    function isTransitionDefined({ when, delay: _delay, delayChildren, staggerChildren, staggerDirection, repeat, repeatType, repeatDelay, from, elapsed, ...transition }) {
        return !!Object.keys(transition).length;
    }

    const animateMotionValue = (name, value, target, transition = {}, element, isHandoff) => (onComplete) => {
        const valueTransition = getValueTransition(transition, name) || {};
        /**
         * Most transition values are currently completely overwritten by value-specific
         * transitions. In the future it'd be nicer to blend these transitions. But for now
         * delay actually does inherit from the root transition if not value-specific.
         */
        const delay = valueTransition.delay || transition.delay || 0;
        /**
         * Elapsed isn't a public transition option but can be passed through from
         * optimized appear effects in milliseconds.
         */
        let { elapsed = 0 } = transition;
        elapsed = elapsed - secondsToMilliseconds(delay);
        let options = {
            keyframes: Array.isArray(target) ? target : [null, target],
            ease: "easeOut",
            velocity: value.getVelocity(),
            ...valueTransition,
            delay: -elapsed,
            onUpdate: (v) => {
                value.set(v);
                valueTransition.onUpdate && valueTransition.onUpdate(v);
            },
            onComplete: () => {
                onComplete();
                valueTransition.onComplete && valueTransition.onComplete();
            },
            name,
            motionValue: value,
            element: isHandoff ? undefined : element,
        };
        /**
         * If there's no transition defined for this value, we can generate
         * unqiue transition settings for this value.
         */
        if (!isTransitionDefined(valueTransition)) {
            options = {
                ...options,
                ...getDefaultTransition(name, options),
            };
        }
        /**
         * Both WAAPI and our internal animation functions use durations
         * as defined by milliseconds, while our external API defines them
         * as seconds.
         */
        if (options.duration) {
            options.duration = secondsToMilliseconds(options.duration);
        }
        if (options.repeatDelay) {
            options.repeatDelay = secondsToMilliseconds(options.repeatDelay);
        }
        if (options.from !== undefined) {
            options.keyframes[0] = options.from;
        }
        let shouldSkip = false;
        if (options.type === false ||
            (options.duration === 0 && !options.repeatDelay)) {
            options.duration = 0;
            if (options.delay === 0) {
                shouldSkip = true;
            }
        }
        /**
         * If we can or must skip creating the animation, and apply only
         * the final keyframe, do so. We also check once keyframes are resolved but
         * this early check prevents the need to create an animation at all.
         */
        if (shouldSkip && !isHandoff && value.get() !== undefined) {
            const finalKeyframe = getFinalKeyframe(options.keyframes, valueTransition);
            if (finalKeyframe !== undefined) {
                frame.update(() => {
                    options.onUpdate(finalKeyframe);
                    options.onComplete();
                });
                // We still want to return some animation controls here rather
                // than returning undefined
                return new GroupPlaybackControls([]);
            }
        }
        /**
         * Animate via WAAPI if possible. If this is a handoff animation, the optimised animation will be running via
         * WAAPI. Therefore, this animation must be JS to ensure it runs "under" the
         * optimised animation.
         */
        if (!isHandoff && AcceleratedAnimation.supports(options)) {
            return new AcceleratedAnimation(options);
        }
        else {
            return new MainThreadAnimation(options);
        }
    };

    /**
     * Decide whether we should block this animation. Previously, we achieved this
     * just by checking whether the key was listed in protectedKeys, but this
     * posed problems if an animation was triggered by afterChildren and protectedKeys
     * had been set to true in the meantime.
     */
    function shouldBlockAnimation({ protectedKeys, needsAnimating }, key) {
        const shouldBlock = protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true;
        needsAnimating[key] = false;
        return shouldBlock;
    }
    function animateTarget(visualElement, targetAndTransition, { delay = 0, transitionOverride, type } = {}) {
        var _a;
        let { transition = visualElement.getDefaultTransition(), transitionEnd, ...target } = targetAndTransition;
        if (transitionOverride)
            transition = transitionOverride;
        const animations = [];
        const animationTypeState = type &&
            visualElement.animationState &&
            visualElement.animationState.getState()[type];
        for (const key in target) {
            const value = visualElement.getValue(key, (_a = visualElement.latestValues[key]) !== null && _a !== undefined ? _a : null);
            const valueTarget = target[key];
            if (valueTarget === undefined ||
                (animationTypeState &&
                    shouldBlockAnimation(animationTypeState, key))) {
                continue;
            }
            const valueTransition = {
                delay,
                ...getValueTransition(transition || {}, key),
            };
            /**
             * If this is the first time a value is being animated, check
             * to see if we're handling off from an existing animation.
             */
            let isHandoff = false;
            if (window.MotionHandoffAnimation) {
                const appearId = getOptimisedAppearId(visualElement);
                if (appearId) {
                    const startTime = window.MotionHandoffAnimation(appearId, key, frame);
                    if (startTime !== null) {
                        valueTransition.startTime = startTime;
                        isHandoff = true;
                    }
                }
            }
            addValueToWillChange(visualElement, key);
            value.start(animateMotionValue(key, value, valueTarget, visualElement.shouldReduceMotion && positionalKeys.has(key)
                ? { type: false }
                : valueTransition, visualElement, isHandoff));
            const animation = value.animation;
            if (animation) {
                animations.push(animation);
            }
        }
        if (transitionEnd) {
            Promise.all(animations).then(() => {
                frame.update(() => {
                    transitionEnd && setTarget(visualElement, transitionEnd);
                });
            });
        }
        return animations;
    }

    function isSVGElement(element) {
        return element instanceof SVGElement && element.tagName !== "svg";
    }

    const createAxis = () => ({ min: 0, max: 0 });
    const createBox = () => ({
        x: createAxis(),
        y: createAxis(),
    });

    const featureProps = {
        animation: [
            "animate",
            "variants",
            "whileHover",
            "whileTap",
            "exit",
            "whileInView",
            "whileFocus",
            "whileDrag",
        ],
        exit: ["exit"],
        drag: ["drag", "dragControls"],
        focus: ["whileFocus"],
        hover: ["whileHover", "onHoverStart", "onHoverEnd"],
        tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
        pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
        inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
        layout: ["layout", "layoutId"],
    };
    const featureDefinitions = {};
    for (const key in featureProps) {
        featureDefinitions[key] = {
            isEnabled: (props) => featureProps[key].some((name) => !!props[name]),
        };
    }

    const isBrowser = typeof window !== "undefined";

    // Does this device prefer reduced motion? Returns `null` server-side.
    const prefersReducedMotion = { current: null };
    const hasReducedMotionListener = { current: false };

    function initPrefersReducedMotion() {
        hasReducedMotionListener.current = true;
        if (!isBrowser)
            return;
        if (window.matchMedia) {
            const motionMediaQuery = window.matchMedia("(prefers-reduced-motion)");
            const setReducedMotionPreferences = () => (prefersReducedMotion.current = motionMediaQuery.matches);
            motionMediaQuery.addListener(setReducedMotionPreferences);
            setReducedMotionPreferences();
        }
        else {
            prefersReducedMotion.current = false;
        }
    }

    /**
     * A list of all ValueTypes
     */
    const valueTypes = [...dimensionValueTypes, color, complex];
    /**
     * Tests a value against the list of ValueTypes
     */
    const findValueType = (v) => valueTypes.find(testValueType(v));

    function isAnimationControls(v) {
        return (v !== null &&
            typeof v === "object" &&
            typeof v.start === "function");
    }

    /**
     * Decides if the supplied variable is variant label
     */
    function isVariantLabel(v) {
        return typeof v === "string" || Array.isArray(v);
    }

    const variantPriorityOrder = [
        "animate",
        "whileInView",
        "whileFocus",
        "whileHover",
        "whileTap",
        "whileDrag",
        "exit",
    ];
    const variantProps = ["initial", ...variantPriorityOrder];

    function isControllingVariants(props) {
        return (isAnimationControls(props.animate) ||
            variantProps.some((name) => isVariantLabel(props[name])));
    }
    function isVariantNode(props) {
        return Boolean(isControllingVariants(props) || props.variants);
    }

    function updateMotionValuesFromProps(element, next, prev) {
        for (const key in next) {
            const nextValue = next[key];
            const prevValue = prev[key];
            if (isMotionValue(nextValue)) {
                /**
                 * If this is a motion value found in props or style, we want to add it
                 * to our visual element's motion value map.
                 */
                element.addValue(key, nextValue);
            }
            else if (isMotionValue(prevValue)) {
                /**
                 * If we're swapping from a motion value to a static value,
                 * create a new motion value from that
                 */
                element.addValue(key, motionValue(nextValue, { owner: element }));
            }
            else if (prevValue !== nextValue) {
                /**
                 * If this is a flat value that has changed, update the motion value
                 * or create one if it doesn't exist. We only want to do this if we're
                 * not handling the value with our animation state.
                 */
                if (element.hasValue(key)) {
                    const existingValue = element.getValue(key);
                    if (existingValue.liveStyle === true) {
                        existingValue.jump(nextValue);
                    }
                    else if (!existingValue.hasAnimated) {
                        existingValue.set(nextValue);
                    }
                }
                else {
                    const latestValue = element.getStaticValue(key);
                    element.addValue(key, motionValue(latestValue !== undefined ? latestValue : nextValue, { owner: element }));
                }
            }
        }
        // Handle removed values
        for (const key in prev) {
            if (next[key] === undefined)
                element.removeValue(key);
        }
        return next;
    }

    const propEventHandlers = [
        "AnimationStart",
        "AnimationComplete",
        "Update",
        "BeforeLayoutMeasure",
        "LayoutMeasure",
        "LayoutAnimationStart",
        "LayoutAnimationComplete",
    ];
    /**
     * A VisualElement is an imperative abstraction around UI elements such as
     * HTMLElement, SVGElement, Three.Object3D etc.
     */
    class VisualElement {
        /**
         * This method takes React props and returns found MotionValues. For example, HTML
         * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
         *
         * This isn't an abstract method as it needs calling in the constructor, but it is
         * intended to be one.
         */
        scrapeMotionValuesFromProps(_props, _prevProps, _visualElement) {
            return {};
        }
        constructor({ parent, props, presenceContext, reducedMotionConfig, blockInitialAnimation, visualState, }, options = {}) {
            /**
             * A reference to the current underlying Instance, e.g. a HTMLElement
             * or Three.Mesh etc.
             */
            this.current = null;
            /**
             * A set containing references to this VisualElement's children.
             */
            this.children = new Set();
            /**
             * Determine what role this visual element should take in the variant tree.
             */
            this.isVariantNode = false;
            this.isControllingVariants = false;
            /**
             * Decides whether this VisualElement should animate in reduced motion
             * mode.
             *
             * TODO: This is currently set on every individual VisualElement but feels
             * like it could be set globally.
             */
            this.shouldReduceMotion = null;
            /**
             * A map of all motion values attached to this visual element. Motion
             * values are source of truth for any given animated value. A motion
             * value might be provided externally by the component via props.
             */
            this.values = new Map();
            this.KeyframeResolver = KeyframeResolver;
            /**
             * Cleanup functions for active features (hover/tap/exit etc)
             */
            this.features = {};
            /**
             * A map of every subscription that binds the provided or generated
             * motion values onChange listeners to this visual element.
             */
            this.valueSubscriptions = new Map();
            /**
             * A reference to the previously-provided motion values as returned
             * from scrapeMotionValuesFromProps. We use the keys in here to determine
             * if any motion values need to be removed after props are updated.
             */
            this.prevMotionValues = {};
            /**
             * An object containing a SubscriptionManager for each active event.
             */
            this.events = {};
            /**
             * An object containing an unsubscribe function for each prop event subscription.
             * For example, every "Update" event can have multiple subscribers via
             * VisualElement.on(), but only one of those can be defined via the onUpdate prop.
             */
            this.propEventSubscriptions = {};
            this.notifyUpdate = () => this.notify("Update", this.latestValues);
            this.render = () => {
                if (!this.current)
                    return;
                this.triggerBuild();
                this.renderInstance(this.current, this.renderState, this.props.style, this.projection);
            };
            this.renderScheduledAt = 0.0;
            this.scheduleRender = () => {
                const now = time.now();
                if (this.renderScheduledAt < now) {
                    this.renderScheduledAt = now;
                    frame.render(this.render, false, true);
                }
            };
            const { latestValues, renderState, onUpdate } = visualState;
            this.onUpdate = onUpdate;
            this.latestValues = latestValues;
            this.baseTarget = { ...latestValues };
            this.initialValues = props.initial ? { ...latestValues } : {};
            this.renderState = renderState;
            this.parent = parent;
            this.props = props;
            this.presenceContext = presenceContext;
            this.depth = parent ? parent.depth + 1 : 0;
            this.reducedMotionConfig = reducedMotionConfig;
            this.options = options;
            this.blockInitialAnimation = Boolean(blockInitialAnimation);
            this.isControllingVariants = isControllingVariants(props);
            this.isVariantNode = isVariantNode(props);
            if (this.isVariantNode) {
                this.variantChildren = new Set();
            }
            this.manuallyAnimateOnMount = Boolean(parent && parent.current);
            /**
             * Any motion values that are provided to the element when created
             * aren't yet bound to the element, as this would technically be impure.
             * However, we iterate through the motion values and set them to the
             * initial values for this component.
             *
             * TODO: This is impure and we should look at changing this to run on mount.
             * Doing so will break some tests but this isn't necessarily a breaking change,
             * more a reflection of the test.
             */
            const { willChange, ...initialMotionValues } = this.scrapeMotionValuesFromProps(props, {}, this);
            for (const key in initialMotionValues) {
                const value = initialMotionValues[key];
                if (latestValues[key] !== undefined && isMotionValue(value)) {
                    value.set(latestValues[key], false);
                }
            }
        }
        mount(instance) {
            this.current = instance;
            visualElementStore.set(instance, this);
            if (this.projection && !this.projection.instance) {
                this.projection.mount(instance);
            }
            if (this.parent && this.isVariantNode && !this.isControllingVariants) {
                this.removeFromVariantTree = this.parent.addVariantChild(this);
            }
            this.values.forEach((value, key) => this.bindToMotionValue(key, value));
            if (!hasReducedMotionListener.current) {
                initPrefersReducedMotion();
            }
            this.shouldReduceMotion =
                this.reducedMotionConfig === "never"
                    ? false
                    : this.reducedMotionConfig === "always"
                        ? true
                        : prefersReducedMotion.current;
            if (this.parent)
                this.parent.children.add(this);
            this.update(this.props, this.presenceContext);
        }
        unmount() {
            visualElementStore.delete(this.current);
            this.projection && this.projection.unmount();
            cancelFrame(this.notifyUpdate);
            cancelFrame(this.render);
            this.valueSubscriptions.forEach((remove) => remove());
            this.valueSubscriptions.clear();
            this.removeFromVariantTree && this.removeFromVariantTree();
            this.parent && this.parent.children.delete(this);
            for (const key in this.events) {
                this.events[key].clear();
            }
            for (const key in this.features) {
                const feature = this.features[key];
                if (feature) {
                    feature.unmount();
                    feature.isMounted = false;
                }
            }
            this.current = null;
        }
        bindToMotionValue(key, value) {
            if (this.valueSubscriptions.has(key)) {
                this.valueSubscriptions.get(key)();
            }
            const valueIsTransform = transformProps.has(key);
            if (valueIsTransform && this.onBindTransform) {
                this.onBindTransform();
            }
            const removeOnChange = value.on("change", (latestValue) => {
                this.latestValues[key] = latestValue;
                this.props.onUpdate && frame.preRender(this.notifyUpdate);
                if (valueIsTransform && this.projection) {
                    this.projection.isTransformDirty = true;
                }
            });
            const removeOnRenderRequest = value.on("renderRequest", this.scheduleRender);
            let removeSyncCheck;
            if (window.MotionCheckAppearSync) {
                removeSyncCheck = window.MotionCheckAppearSync(this, key, value);
            }
            this.valueSubscriptions.set(key, () => {
                removeOnChange();
                removeOnRenderRequest();
                if (removeSyncCheck)
                    removeSyncCheck();
                if (value.owner)
                    value.stop();
            });
        }
        sortNodePosition(other) {
            /**
             * If these nodes aren't even of the same type we can't compare their depth.
             */
            if (!this.current ||
                !this.sortInstanceNodePosition ||
                this.type !== other.type) {
                return 0;
            }
            return this.sortInstanceNodePosition(this.current, other.current);
        }
        updateFeatures() {
            let key = "animation";
            for (key in featureDefinitions) {
                const featureDefinition = featureDefinitions[key];
                if (!featureDefinition)
                    continue;
                const { isEnabled, Feature: FeatureConstructor } = featureDefinition;
                /**
                 * If this feature is enabled but not active, make a new instance.
                 */
                if (!this.features[key] &&
                    FeatureConstructor &&
                    isEnabled(this.props)) {
                    this.features[key] = new FeatureConstructor(this);
                }
                /**
                 * If we have a feature, mount or update it.
                 */
                if (this.features[key]) {
                    const feature = this.features[key];
                    if (feature.isMounted) {
                        feature.update();
                    }
                    else {
                        feature.mount();
                        feature.isMounted = true;
                    }
                }
            }
        }
        triggerBuild() {
            this.build(this.renderState, this.latestValues, this.props);
        }
        /**
         * Measure the current viewport box with or without transforms.
         * Only measures axis-aligned boxes, rotate and skew must be manually
         * removed with a re-render to work.
         */
        measureViewportBox() {
            return this.current
                ? this.measureInstanceViewportBox(this.current, this.props)
                : createBox();
        }
        getStaticValue(key) {
            return this.latestValues[key];
        }
        setStaticValue(key, value) {
            this.latestValues[key] = value;
        }
        /**
         * Update the provided props. Ensure any newly-added motion values are
         * added to our map, old ones removed, and listeners updated.
         */
        update(props, presenceContext) {
            if (props.transformTemplate || this.props.transformTemplate) {
                this.scheduleRender();
            }
            this.prevProps = this.props;
            this.props = props;
            this.prevPresenceContext = this.presenceContext;
            this.presenceContext = presenceContext;
            /**
             * Update prop event handlers ie onAnimationStart, onAnimationComplete
             */
            for (let i = 0; i < propEventHandlers.length; i++) {
                const key = propEventHandlers[i];
                if (this.propEventSubscriptions[key]) {
                    this.propEventSubscriptions[key]();
                    delete this.propEventSubscriptions[key];
                }
                const listenerName = ("on" + key);
                const listener = props[listenerName];
                if (listener) {
                    this.propEventSubscriptions[key] = this.on(key, listener);
                }
            }
            this.prevMotionValues = updateMotionValuesFromProps(this, this.scrapeMotionValuesFromProps(props, this.prevProps, this), this.prevMotionValues);
            if (this.handleChildMotionValue) {
                this.handleChildMotionValue();
            }
            this.onUpdate && this.onUpdate(this);
        }
        getProps() {
            return this.props;
        }
        /**
         * Returns the variant definition with a given name.
         */
        getVariant(name) {
            return this.props.variants ? this.props.variants[name] : undefined;
        }
        /**
         * Returns the defined default transition on this component.
         */
        getDefaultTransition() {
            return this.props.transition;
        }
        getTransformPagePoint() {
            return this.props.transformPagePoint;
        }
        getClosestVariantNode() {
            return this.isVariantNode
                ? this
                : this.parent
                    ? this.parent.getClosestVariantNode()
                    : undefined;
        }
        /**
         * Add a child visual element to our set of children.
         */
        addVariantChild(child) {
            const closestVariantNode = this.getClosestVariantNode();
            if (closestVariantNode) {
                closestVariantNode.variantChildren &&
                    closestVariantNode.variantChildren.add(child);
                return () => closestVariantNode.variantChildren.delete(child);
            }
        }
        /**
         * Add a motion value and bind it to this visual element.
         */
        addValue(key, value) {
            // Remove existing value if it exists
            const existingValue = this.values.get(key);
            if (value !== existingValue) {
                if (existingValue)
                    this.removeValue(key);
                this.bindToMotionValue(key, value);
                this.values.set(key, value);
                this.latestValues[key] = value.get();
            }
        }
        /**
         * Remove a motion value and unbind any active subscriptions.
         */
        removeValue(key) {
            this.values.delete(key);
            const unsubscribe = this.valueSubscriptions.get(key);
            if (unsubscribe) {
                unsubscribe();
                this.valueSubscriptions.delete(key);
            }
            delete this.latestValues[key];
            this.removeValueFromRenderState(key, this.renderState);
        }
        /**
         * Check whether we have a motion value for this key
         */
        hasValue(key) {
            return this.values.has(key);
        }
        getValue(key, defaultValue) {
            if (this.props.values && this.props.values[key]) {
                return this.props.values[key];
            }
            let value = this.values.get(key);
            if (value === undefined && defaultValue !== undefined) {
                value = motionValue(defaultValue === null ? undefined : defaultValue, { owner: this });
                this.addValue(key, value);
            }
            return value;
        }
        /**
         * If we're trying to animate to a previously unencountered value,
         * we need to check for it in our state and as a last resort read it
         * directly from the instance (which might have performance implications).
         */
        readValue(key, target) {
            var _a;
            let value = this.latestValues[key] !== undefined || !this.current
                ? this.latestValues[key]
                : (_a = this.getBaseTargetFromProps(this.props, key)) !== null && _a !== undefined ? _a : this.readValueFromInstance(this.current, key, this.options);
            if (value !== undefined && value !== null) {
                if (typeof value === "string" &&
                    (isNumericalString(value) || isZeroValueString(value))) {
                    // If this is a number read as a string, ie "0" or "200", convert it to a number
                    value = parseFloat(value);
                }
                else if (!findValueType(value) && complex.test(target)) {
                    value = getAnimatableNone(key, target);
                }
                this.setBaseTarget(key, isMotionValue(value) ? value.get() : value);
            }
            return isMotionValue(value) ? value.get() : value;
        }
        /**
         * Set the base target to later animate back to. This is currently
         * only hydrated on creation and when we first read a value.
         */
        setBaseTarget(key, value) {
            this.baseTarget[key] = value;
        }
        /**
         * Find the base target for a value thats been removed from all animation
         * props.
         */
        getBaseTarget(key) {
            var _a;
            const { initial } = this.props;
            let valueFromInitial;
            if (typeof initial === "string" || typeof initial === "object") {
                const variant = resolveVariantFromProps(this.props, initial, (_a = this.presenceContext) === null || _a === undefined ? undefined : _a.custom);
                if (variant) {
                    valueFromInitial = variant[key];
                }
            }
            /**
             * If this value still exists in the current initial variant, read that.
             */
            if (initial && valueFromInitial !== undefined) {
                return valueFromInitial;
            }
            /**
             * Alternatively, if this VisualElement config has defined a getBaseTarget
             * so we can read the value from an alternative source, try that.
             */
            const target = this.getBaseTargetFromProps(this.props, key);
            if (target !== undefined && !isMotionValue(target))
                return target;
            /**
             * If the value was initially defined on initial, but it doesn't any more,
             * return undefined. Otherwise return the value as initially read from the DOM.
             */
            return this.initialValues[key] !== undefined &&
                valueFromInitial === undefined
                ? undefined
                : this.baseTarget[key];
        }
        on(eventName, callback) {
            if (!this.events[eventName]) {
                this.events[eventName] = new SubscriptionManager();
            }
            return this.events[eventName].add(callback);
        }
        notify(eventName, ...args) {
            if (this.events[eventName]) {
                this.events[eventName].notify(...args);
            }
        }
    }

    class DOMVisualElement extends VisualElement {
        constructor() {
            super(...arguments);
            this.KeyframeResolver = DOMKeyframesResolver;
        }
        sortInstanceNodePosition(a, b) {
            /**
             * compareDocumentPosition returns a bitmask, by using the bitwise &
             * we're returning true if 2 in that bitmask is set to true. 2 is set
             * to true if b preceeds a.
             */
            return a.compareDocumentPosition(b) & 2 ? 1 : -1;
        }
        getBaseTargetFromProps(props, key) {
            return props.style
                ? props.style[key]
                : undefined;
        }
        removeValueFromRenderState(key, { vars, style }) {
            delete vars[key];
            delete style[key];
        }
        handleChildMotionValue() {
            if (this.childSubscription) {
                this.childSubscription();
                delete this.childSubscription;
            }
            const { children } = this.props;
            if (isMotionValue(children)) {
                this.childSubscription = children.on("change", (latest) => {
                    if (this.current) {
                        this.current.textContent = `${latest}`;
                    }
                });
            }
        }
    }

    /**
     * Provided a value and a ValueType, returns the value as that value type.
     */
    const getValueAsType = (value, type) => {
        return type && typeof value === "number"
            ? type.transform(value)
            : value;
    };

    const translateAlias = {
        x: "translateX",
        y: "translateY",
        z: "translateZ",
        transformPerspective: "perspective",
    };
    const numTransforms = transformPropOrder.length;
    /**
     * Build a CSS transform style from individual x/y/scale etc properties.
     *
     * This outputs with a default order of transforms/scales/rotations, this can be customised by
     * providing a transformTemplate function.
     */
    function buildTransform(latestValues, transform, transformTemplate) {
        // The transform string we're going to build into.
        let transformString = "";
        let transformIsDefault = true;
        /**
         * Loop over all possible transforms in order, adding the ones that
         * are present to the transform string.
         */
        for (let i = 0; i < numTransforms; i++) {
            const key = transformPropOrder[i];
            const value = latestValues[key];
            if (value === undefined)
                continue;
            let valueIsDefault = true;
            if (typeof value === "number") {
                valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
            }
            else {
                valueIsDefault = parseFloat(value) === 0;
            }
            if (!valueIsDefault || transformTemplate) {
                const valueAsType = getValueAsType(value, numberValueTypes[key]);
                if (!valueIsDefault) {
                    transformIsDefault = false;
                    const transformName = translateAlias[key] || key;
                    transformString += `${transformName}(${valueAsType}) `;
                }
                if (transformTemplate) {
                    transform[key] = valueAsType;
                }
            }
        }
        transformString = transformString.trim();
        // If we have a custom `transform` template, pass our transform values and
        // generated transformString to that before returning
        if (transformTemplate) {
            transformString = transformTemplate(transform, transformIsDefault ? "" : transformString);
        }
        else if (transformIsDefault) {
            transformString = "none";
        }
        return transformString;
    }

    function buildHTMLStyles(state, latestValues, transformTemplate) {
        const { style, vars, transformOrigin } = state;
        // Track whether we encounter any transform or transformOrigin values.
        let hasTransform = false;
        let hasTransformOrigin = false;
        /**
         * Loop over all our latest animated values and decide whether to handle them
         * as a style or CSS variable.
         *
         * Transforms and transform origins are kept separately for further processing.
         */
        for (const key in latestValues) {
            const value = latestValues[key];
            if (transformProps.has(key)) {
                // If this is a transform, flag to enable further transform processing
                hasTransform = true;
                continue;
            }
            else if (isCSSVariableName(key)) {
                vars[key] = value;
                continue;
            }
            else {
                // Convert the value to its default value type, ie 0 -> "0px"
                const valueAsType = getValueAsType(value, numberValueTypes[key]);
                if (key.startsWith("origin")) {
                    // If this is a transform origin, flag and enable further transform-origin processing
                    hasTransformOrigin = true;
                    transformOrigin[key] =
                        valueAsType;
                }
                else {
                    style[key] = valueAsType;
                }
            }
        }
        if (!latestValues.transform) {
            if (hasTransform || transformTemplate) {
                style.transform = buildTransform(latestValues, state.transform, transformTemplate);
            }
            else if (style.transform) {
                /**
                 * If we have previously created a transform but currently don't have any,
                 * reset transform style to none.
                 */
                style.transform = "none";
            }
        }
        /**
         * Build a transformOrigin style. Uses the same defaults as the browser for
         * undefined origins.
         */
        if (hasTransformOrigin) {
            const { originX = "50%", originY = "50%", originZ = 0, } = transformOrigin;
            style.transformOrigin = `${originX} ${originY} ${originZ}`;
        }
    }

    const dashKeys = {
        offset: "stroke-dashoffset",
        array: "stroke-dasharray",
    };
    const camelKeys = {
        offset: "strokeDashoffset",
        array: "strokeDasharray",
    };
    /**
     * Build SVG path properties. Uses the path's measured length to convert
     * our custom pathLength, pathSpacing and pathOffset into stroke-dashoffset
     * and stroke-dasharray attributes.
     *
     * This function is mutative to reduce per-frame GC.
     */
    function buildSVGPath(attrs, length, spacing = 1, offset = 0, useDashCase = true) {
        // Normalise path length by setting SVG attribute pathLength to 1
        attrs.pathLength = 1;
        // We use dash case when setting attributes directly to the DOM node and camel case
        // when defining props on a React component.
        const keys = useDashCase ? dashKeys : camelKeys;
        // Build the dash offset
        attrs[keys.offset] = px.transform(-offset);
        // Build the dash array
        const pathLength = px.transform(length);
        const pathSpacing = px.transform(spacing);
        attrs[keys.array] = `${pathLength} ${pathSpacing}`;
    }

    function calcOrigin(origin, offset, size) {
        return typeof origin === "string"
            ? origin
            : px.transform(offset + size * origin);
    }
    /**
     * The SVG transform origin defaults are different to CSS and is less intuitive,
     * so we use the measured dimensions of the SVG to reconcile these.
     */
    function calcSVGTransformOrigin(dimensions, originX, originY) {
        const pxOriginX = calcOrigin(originX, dimensions.x, dimensions.width);
        const pxOriginY = calcOrigin(originY, dimensions.y, dimensions.height);
        return `${pxOriginX} ${pxOriginY}`;
    }

    /**
     * Build SVG visual attrbutes, like cx and style.transform
     */
    function buildSVGAttrs(state, { attrX, attrY, attrScale, originX, originY, pathLength, pathSpacing = 1, pathOffset = 0, 
    // This is object creation, which we try to avoid per-frame.
    ...latest }, isSVGTag, transformTemplate) {
        buildHTMLStyles(state, latest, transformTemplate);
        /**
         * For svg tags we just want to make sure viewBox is animatable and treat all the styles
         * as normal HTML tags.
         */
        if (isSVGTag) {
            if (state.style.viewBox) {
                state.attrs.viewBox = state.style.viewBox;
            }
            return;
        }
        state.attrs = state.style;
        state.style = {};
        const { attrs, style, dimensions } = state;
        /**
         * However, we apply transforms as CSS transforms. So if we detect a transform we take it from attrs
         * and copy it into style.
         */
        if (attrs.transform) {
            if (dimensions)
                style.transform = attrs.transform;
            delete attrs.transform;
        }
        // Parse transformOrigin
        if (dimensions &&
            (originX !== undefined || originY !== undefined || style.transform)) {
            style.transformOrigin = calcSVGTransformOrigin(dimensions, originX !== undefined ? originX : 0.5, originY !== undefined ? originY : 0.5);
        }
        // Render attrX/attrY/attrScale as attributes
        if (attrX !== undefined)
            attrs.x = attrX;
        if (attrY !== undefined)
            attrs.y = attrY;
        if (attrScale !== undefined)
            attrs.scale = attrScale;
        // Build SVG path if one has been defined
        if (pathLength !== undefined) {
            buildSVGPath(attrs, pathLength, pathSpacing, pathOffset, false);
        }
    }

    /**
     * A set of attribute names that are always read/written as camel case.
     */
    const camelCaseAttributes = new Set([
        "baseFrequency",
        "diffuseConstant",
        "kernelMatrix",
        "kernelUnitLength",
        "keySplines",
        "keyTimes",
        "limitingConeAngle",
        "markerHeight",
        "markerWidth",
        "numOctaves",
        "targetX",
        "targetY",
        "surfaceScale",
        "specularConstant",
        "specularExponent",
        "stdDeviation",
        "tableValues",
        "viewBox",
        "gradientTransform",
        "pathLength",
        "startOffset",
        "textLength",
        "lengthAdjust",
    ]);

    const isSVGTag = (tag) => typeof tag === "string" && tag.toLowerCase() === "svg";

    function updateSVGDimensions(instance, renderState) {
        try {
            renderState.dimensions =
                typeof instance.getBBox === "function"
                    ? instance.getBBox()
                    : instance.getBoundingClientRect();
        }
        catch (e) {
            // Most likely trying to measure an unrendered element under Firefox
            renderState.dimensions = {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            };
        }
    }

    function renderHTML(element, { style, vars }, styleProp, projection) {
        Object.assign(element.style, style, projection && projection.getProjectionStyles(styleProp));
        // Loop over any CSS variables and assign those.
        for (const key in vars) {
            element.style.setProperty(key, vars[key]);
        }
    }

    function renderSVG(element, renderState, _styleProp, projection) {
        renderHTML(element, renderState, undefined, projection);
        for (const key in renderState.attrs) {
            element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
        }
    }

    const scaleCorrectors = {};

    function isForcedMotionValue(key, { layout, layoutId }) {
        return (transformProps.has(key) ||
            key.startsWith("origin") ||
            ((layout || layoutId !== undefined) &&
                (!!scaleCorrectors[key] || key === "opacity")));
    }

    function scrapeMotionValuesFromProps$1(props, prevProps, visualElement) {
        var _a;
        const { style } = props;
        const newValues = {};
        for (const key in style) {
            if (isMotionValue(style[key]) ||
                (prevProps.style &&
                    isMotionValue(prevProps.style[key])) ||
                isForcedMotionValue(key, props) ||
                ((_a = visualElement === null || visualElement === undefined ? undefined : visualElement.getValue(key)) === null || _a === undefined ? undefined : _a.liveStyle) !== undefined) {
                newValues[key] = style[key];
            }
        }
        return newValues;
    }

    function scrapeMotionValuesFromProps(props, prevProps, visualElement) {
        const newValues = scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
        for (const key in props) {
            if (isMotionValue(props[key]) ||
                isMotionValue(prevProps[key])) {
                const targetKey = transformPropOrder.indexOf(key) !== -1
                    ? "attr" + key.charAt(0).toUpperCase() + key.substring(1)
                    : key;
                newValues[targetKey] = props[key];
            }
        }
        return newValues;
    }

    class SVGVisualElement extends DOMVisualElement {
        constructor() {
            super(...arguments);
            this.type = "svg";
            this.isSVGTag = false;
            this.measureInstanceViewportBox = createBox;
            this.updateDimensions = () => {
                if (this.current && !this.renderState.dimensions) {
                    updateSVGDimensions(this.current, this.renderState);
                }
            };
        }
        getBaseTargetFromProps(props, key) {
            return props[key];
        }
        readValueFromInstance(instance, key) {
            if (transformProps.has(key)) {
                const defaultType = getDefaultValueType(key);
                return defaultType ? defaultType.default || 0 : 0;
            }
            key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
            return instance.getAttribute(key);
        }
        scrapeMotionValuesFromProps(props, prevProps, visualElement) {
            return scrapeMotionValuesFromProps(props, prevProps, visualElement);
        }
        onBindTransform() {
            if (this.current && !this.renderState.dimensions) {
                frame.postRender(this.updateDimensions);
            }
        }
        build(renderState, latestValues, props) {
            buildSVGAttrs(renderState, latestValues, this.isSVGTag, props.transformTemplate);
        }
        renderInstance(instance, renderState, styleProp, projection) {
            renderSVG(instance, renderState, styleProp, projection);
        }
        mount(instance) {
            this.isSVGTag = isSVGTag(instance.tagName);
            super.mount(instance);
        }
    }

    /**
     * Bounding boxes tend to be defined as top, left, right, bottom. For various operations
     * it's easier to consider each axis individually. This function returns a bounding box
     * as a map of single-axis min/max values.
     */
    function convertBoundingBoxToBox({ top, left, right, bottom, }) {
        return {
            x: { min: left, max: right },
            y: { min: top, max: bottom },
        };
    }
    /**
     * Applies a TransformPoint function to a bounding box. TransformPoint is usually a function
     * provided by Framer to allow measured points to be corrected for device scaling. This is used
     * when measuring DOM elements and DOM event points.
     */
    function transformBoxPoints(point, transformPoint) {
        if (!transformPoint)
            return point;
        const topLeft = transformPoint({ x: point.left, y: point.top });
        const bottomRight = transformPoint({ x: point.right, y: point.bottom });
        return {
            top: topLeft.y,
            left: topLeft.x,
            bottom: bottomRight.y,
            right: bottomRight.x,
        };
    }

    function measureViewportBox(instance, transformPoint) {
        return convertBoundingBoxToBox(transformBoxPoints(instance.getBoundingClientRect(), transformPoint));
    }

    function getComputedStyle$1(element) {
        return window.getComputedStyle(element);
    }
    class HTMLVisualElement extends DOMVisualElement {
        constructor() {
            super(...arguments);
            this.type = "html";
            this.renderInstance = renderHTML;
        }
        readValueFromInstance(instance, key) {
            if (transformProps.has(key)) {
                const defaultType = getDefaultValueType(key);
                return defaultType ? defaultType.default || 0 : 0;
            }
            else {
                const computedStyle = getComputedStyle$1(instance);
                const value = (isCSSVariableName(key)
                    ? computedStyle.getPropertyValue(key)
                    : computedStyle[key]) || 0;
                return typeof value === "string" ? value.trim() : value;
            }
        }
        measureInstanceViewportBox(instance, { transformPagePoint }) {
            return measureViewportBox(instance, transformPagePoint);
        }
        build(renderState, latestValues, props) {
            buildHTMLStyles(renderState, latestValues, props.transformTemplate);
        }
        scrapeMotionValuesFromProps(props, prevProps, visualElement) {
            return scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
        }
    }

    function isObjectKey(key, object) {
        return key in object;
    }
    class ObjectVisualElement extends VisualElement {
        constructor() {
            super(...arguments);
            this.type = "object";
        }
        readValueFromInstance(instance, key) {
            if (isObjectKey(key, instance)) {
                const value = instance[key];
                if (typeof value === "string" || typeof value === "number") {
                    return value;
                }
            }
            return undefined;
        }
        getBaseTargetFromProps() {
            return undefined;
        }
        removeValueFromRenderState(key, renderState) {
            delete renderState.output[key];
        }
        measureInstanceViewportBox() {
            return createBox();
        }
        build(renderState, latestValues) {
            Object.assign(renderState.output, latestValues);
        }
        renderInstance(instance, { output }) {
            Object.assign(instance, output);
        }
        sortInstanceNodePosition() {
            return 0;
        }
    }

    function createDOMVisualElement(element) {
        const options = {
            presenceContext: null,
            props: {},
            visualState: {
                renderState: {
                    transform: {},
                    transformOrigin: {},
                    style: {},
                    vars: {},
                    attrs: {},
                },
                latestValues: {},
            },
        };
        const node = isSVGElement(element)
            ? new SVGVisualElement(options)
            : new HTMLVisualElement(options);
        node.mount(element);
        visualElementStore.set(element, node);
    }
    function createObjectVisualElement(subject) {
        const options = {
            presenceContext: null,
            props: {},
            visualState: {
                renderState: {
                    output: {},
                },
                latestValues: {},
            },
        };
        const node = new ObjectVisualElement(options);
        node.mount(subject);
        visualElementStore.set(subject, node);
    }

    function animateSingleValue(value, keyframes, options) {
        const motionValue$1 = isMotionValue(value) ? value : motionValue(value);
        motionValue$1.start(animateMotionValue("", motionValue$1, keyframes, options));
        return motionValue$1.animation;
    }

    function isSingleValue(subject, keyframes) {
        return (isMotionValue(subject) ||
            typeof subject === "number" ||
            (typeof subject === "string" && !isDOMKeyframes(keyframes)));
    }
    /**
     * Implementation
     */
    function animateSubject(subject, keyframes, options, scope) {
        const animations = [];
        if (isSingleValue(subject, keyframes)) {
            animations.push(animateSingleValue(subject, isDOMKeyframes(keyframes)
                ? keyframes.default || keyframes
                : keyframes, options ? options.default || options : options));
        }
        else {
            const subjects = resolveSubjects(subject, keyframes, scope);
            const numSubjects = subjects.length;
            for (let i = 0; i < numSubjects; i++) {
                const thisSubject = subjects[i];
                const createVisualElement = thisSubject instanceof Element
                    ? createDOMVisualElement
                    : createObjectVisualElement;
                if (!visualElementStore.has(thisSubject)) {
                    createVisualElement(thisSubject);
                }
                const visualElement = visualElementStore.get(thisSubject);
                const transition = { ...options };
                /**
                 * Resolve stagger function if provided.
                 */
                if ("delay" in transition &&
                    typeof transition.delay === "function") {
                    transition.delay = transition.delay(i, numSubjects);
                }
                animations.push(...animateTarget(visualElement, { ...keyframes, transition }, {}));
            }
        }
        return animations;
    }

    function animateSequence(sequence, options, scope) {
        const animations = [];
        const animationDefinitions = createAnimationsFromSequence(sequence, options, scope, { spring });
        animationDefinitions.forEach(({ keyframes, transition }, subject) => {
            animations.push(...animateSubject(subject, keyframes, transition));
        });
        return animations;
    }

    function isSequence(value) {
        return Array.isArray(value) && value.some(Array.isArray);
    }
    /**
     * Creates an animation function that is optionally scoped
     * to a specific element.
     */
    function createScopedAnimate(scope) {
        /**
         * Implementation
         */
        function scopedAnimate(subjectOrSequence, optionsOrKeyframes, options) {
            let animations = [];
            if (isSequence(subjectOrSequence)) {
                animations = animateSequence(subjectOrSequence, optionsOrKeyframes, scope);
            }
            else {
                animations = animateSubject(subjectOrSequence, optionsOrKeyframes, options, scope);
            }
            const animation = new GroupPlaybackControls(animations);
            return animation;
        }
        return scopedAnimate;
    }
    const animate = createScopedAnimate();

    function observeTimeline(update, timeline) {
        let prevProgress;
        const onFrame = () => {
            const { currentTime } = timeline;
            const percentage = currentTime === null ? 0 : currentTime.value;
            const progress = percentage / 100;
            if (prevProgress !== progress) {
                update(progress);
            }
            prevProgress = progress;
        };
        frame.update(onFrame, true);
        return () => cancelFrame(onFrame);
    }

    const resizeHandlers = new WeakMap();
    let observer$1;
    function getElementSize(target, borderBoxSize) {
        if (borderBoxSize) {
            const { inlineSize, blockSize } = borderBoxSize[0];
            return { width: inlineSize, height: blockSize };
        }
        else if (target instanceof SVGElement && "getBBox" in target) {
            return target.getBBox();
        }
        else {
            return {
                width: target.offsetWidth,
                height: target.offsetHeight,
            };
        }
    }
    function notifyTarget({ target, contentRect, borderBoxSize, }) {
        var _a;
        (_a = resizeHandlers.get(target)) === null || _a === undefined ? undefined : _a.forEach((handler) => {
            handler({
                target,
                contentSize: contentRect,
                get size() {
                    return getElementSize(target, borderBoxSize);
                },
            });
        });
    }
    function notifyAll(entries) {
        entries.forEach(notifyTarget);
    }
    function createResizeObserver() {
        if (typeof ResizeObserver === "undefined")
            return;
        observer$1 = new ResizeObserver(notifyAll);
    }
    function resizeElement(target, handler) {
        if (!observer$1)
            createResizeObserver();
        const elements = resolveElements(target);
        elements.forEach((element) => {
            let elementHandlers = resizeHandlers.get(element);
            if (!elementHandlers) {
                elementHandlers = new Set();
                resizeHandlers.set(element, elementHandlers);
            }
            elementHandlers.add(handler);
            observer$1 === null || observer$1 === undefined ? undefined : observer$1.observe(element);
        });
        return () => {
            elements.forEach((element) => {
                const elementHandlers = resizeHandlers.get(element);
                elementHandlers === null || elementHandlers === undefined ? undefined : elementHandlers.delete(handler);
                if (!(elementHandlers === null || elementHandlers === undefined ? undefined : elementHandlers.size)) {
                    observer$1 === null || observer$1 === undefined ? undefined : observer$1.unobserve(element);
                }
            });
        };
    }

    const windowCallbacks = new Set();
    let windowResizeHandler;
    function createWindowResizeHandler() {
        windowResizeHandler = () => {
            const size = {
                width: window.innerWidth,
                height: window.innerHeight,
            };
            const info = {
                target: window,
                size,
                contentSize: size,
            };
            windowCallbacks.forEach((callback) => callback(info));
        };
        window.addEventListener("resize", windowResizeHandler);
    }
    function resizeWindow(callback) {
        windowCallbacks.add(callback);
        if (!windowResizeHandler)
            createWindowResizeHandler();
        return () => {
            windowCallbacks.delete(callback);
            if (!windowCallbacks.size && windowResizeHandler) {
                windowResizeHandler = undefined;
            }
        };
    }

    function resize(a, b) {
        return typeof a === "function" ? resizeWindow(a) : resizeElement(a, b);
    }

    /**
     * A time in milliseconds, beyond which we consider the scroll velocity to be 0.
     */
    const maxElapsed = 50;
    const createAxisInfo = () => ({
        current: 0,
        offset: [],
        progress: 0,
        scrollLength: 0,
        targetOffset: 0,
        targetLength: 0,
        containerLength: 0,
        velocity: 0,
    });
    const createScrollInfo = () => ({
        time: 0,
        x: createAxisInfo(),
        y: createAxisInfo(),
    });
    const keys = {
        x: {
            length: "Width",
            position: "Left",
        },
        y: {
            length: "Height",
            position: "Top",
        },
    };
    function updateAxisInfo(element, axisName, info, time) {
        const axis = info[axisName];
        const { length, position } = keys[axisName];
        const prev = axis.current;
        const prevTime = info.time;
        axis.current = element[`scroll${position}`];
        axis.scrollLength = element[`scroll${length}`] - element[`client${length}`];
        axis.offset.length = 0;
        axis.offset[0] = 0;
        axis.offset[1] = axis.scrollLength;
        axis.progress = progress(0, axis.scrollLength, axis.current);
        const elapsed = time - prevTime;
        axis.velocity =
            elapsed > maxElapsed
                ? 0
                : velocityPerSecond(axis.current - prev, elapsed);
    }
    function updateScrollInfo(element, info, time) {
        updateAxisInfo(element, "x", info, time);
        updateAxisInfo(element, "y", info, time);
        info.time = time;
    }

    function calcInset(element, container) {
        const inset = { x: 0, y: 0 };
        let current = element;
        while (current && current !== container) {
            if (current instanceof HTMLElement) {
                inset.x += current.offsetLeft;
                inset.y += current.offsetTop;
                current = current.offsetParent;
            }
            else if (current.tagName === "svg") {
                /**
                 * This isn't an ideal approach to measuring the offset of <svg /> tags.
                 * It would be preferable, given they behave like HTMLElements in most ways
                 * to use offsetLeft/Top. But these don't exist on <svg />. Likewise we
                 * can't use .getBBox() like most SVG elements as these provide the offset
                 * relative to the SVG itself, which for <svg /> is usually 0x0.
                 */
                const svgBoundingBox = current.getBoundingClientRect();
                current = current.parentElement;
                const parentBoundingBox = current.getBoundingClientRect();
                inset.x += svgBoundingBox.left - parentBoundingBox.left;
                inset.y += svgBoundingBox.top - parentBoundingBox.top;
            }
            else if (current instanceof SVGGraphicsElement) {
                const { x, y } = current.getBBox();
                inset.x += x;
                inset.y += y;
                let svg = null;
                let parent = current.parentNode;
                while (!svg) {
                    if (parent.tagName === "svg") {
                        svg = parent;
                    }
                    parent = current.parentNode;
                }
                current = svg;
            }
            else {
                break;
            }
        }
        return inset;
    }

    const namedEdges = {
        start: 0,
        center: 0.5,
        end: 1,
    };
    function resolveEdge(edge, length, inset = 0) {
        let delta = 0;
        /**
         * If we have this edge defined as a preset, replace the definition
         * with the numerical value.
         */
        if (edge in namedEdges) {
            edge = namedEdges[edge];
        }
        /**
         * Handle unit values
         */
        if (typeof edge === "string") {
            const asNumber = parseFloat(edge);
            if (edge.endsWith("px")) {
                delta = asNumber;
            }
            else if (edge.endsWith("%")) {
                edge = asNumber / 100;
            }
            else if (edge.endsWith("vw")) {
                delta = (asNumber / 100) * document.documentElement.clientWidth;
            }
            else if (edge.endsWith("vh")) {
                delta = (asNumber / 100) * document.documentElement.clientHeight;
            }
            else {
                edge = asNumber;
            }
        }
        /**
         * If the edge is defined as a number, handle as a progress value.
         */
        if (typeof edge === "number") {
            delta = length * edge;
        }
        return inset + delta;
    }

    const defaultOffset = [0, 0];
    function resolveOffset(offset, containerLength, targetLength, targetInset) {
        let offsetDefinition = Array.isArray(offset) ? offset : defaultOffset;
        let targetPoint = 0;
        let containerPoint = 0;
        if (typeof offset === "number") {
            /**
             * If we're provided offset: [0, 0.5, 1] then each number x should become
             * [x, x], so we default to the behaviour of mapping 0 => 0 of both target
             * and container etc.
             */
            offsetDefinition = [offset, offset];
        }
        else if (typeof offset === "string") {
            offset = offset.trim();
            if (offset.includes(" ")) {
                offsetDefinition = offset.split(" ");
            }
            else {
                /**
                 * If we're provided a definition like "100px" then we want to apply
                 * that only to the top of the target point, leaving the container at 0.
                 * Whereas a named offset like "end" should be applied to both.
                 */
                offsetDefinition = [offset, namedEdges[offset] ? offset : `0`];
            }
        }
        targetPoint = resolveEdge(offsetDefinition[0], targetLength, targetInset);
        containerPoint = resolveEdge(offsetDefinition[1], containerLength);
        return targetPoint - containerPoint;
    }

    const ScrollOffset = {
        All: [
            [0, 0],
            [1, 1],
        ],
    };

    const point = { x: 0, y: 0 };
    function getTargetSize(target) {
        return "getBBox" in target && target.tagName !== "svg"
            ? target.getBBox()
            : { width: target.clientWidth, height: target.clientHeight };
    }
    function resolveOffsets(container, info, options) {
        const { offset: offsetDefinition = ScrollOffset.All } = options;
        const { target = container, axis = "y" } = options;
        const lengthLabel = axis === "y" ? "height" : "width";
        const inset = target !== container ? calcInset(target, container) : point;
        /**
         * Measure the target and container. If they're the same thing then we
         * use the container's scrollWidth/Height as the target, from there
         * all other calculations can remain the same.
         */
        const targetSize = target === container
            ? { width: container.scrollWidth, height: container.scrollHeight }
            : getTargetSize(target);
        const containerSize = {
            width: container.clientWidth,
            height: container.clientHeight,
        };
        /**
         * Reset the length of the resolved offset array rather than creating a new one.
         * TODO: More reusable data structures for targetSize/containerSize would also be good.
         */
        info[axis].offset.length = 0;
        /**
         * Populate the offset array by resolving the user's offset definition into
         * a list of pixel scroll offets.
         */
        let hasChanged = !info[axis].interpolate;
        const numOffsets = offsetDefinition.length;
        for (let i = 0; i < numOffsets; i++) {
            const offset = resolveOffset(offsetDefinition[i], containerSize[lengthLabel], targetSize[lengthLabel], inset[axis]);
            if (!hasChanged && offset !== info[axis].interpolatorOffsets[i]) {
                hasChanged = true;
            }
            info[axis].offset[i] = offset;
        }
        /**
         * If the pixel scroll offsets have changed, create a new interpolator function
         * to map scroll value into a progress.
         */
        if (hasChanged) {
            info[axis].interpolate = interpolate(info[axis].offset, defaultOffset$1(offsetDefinition), { clamp: false });
            info[axis].interpolatorOffsets = [...info[axis].offset];
        }
        info[axis].progress = clamp(0, 1, info[axis].interpolate(info[axis].current));
    }

    function measure(container, target = container, info) {
        /**
         * Find inset of target within scrollable container
         */
        info.x.targetOffset = 0;
        info.y.targetOffset = 0;
        if (target !== container) {
            let node = target;
            while (node && node !== container) {
                info.x.targetOffset += node.offsetLeft;
                info.y.targetOffset += node.offsetTop;
                node = node.offsetParent;
            }
        }
        info.x.targetLength =
            target === container ? target.scrollWidth : target.clientWidth;
        info.y.targetLength =
            target === container ? target.scrollHeight : target.clientHeight;
        info.x.containerLength = container.clientWidth;
        info.y.containerLength = container.clientHeight;
    }
    function createOnScrollHandler(element, onScroll, info, options = {}) {
        return {
            measure: () => measure(element, options.target, info),
            update: (time) => {
                updateScrollInfo(element, info, time);
                if (options.offset || options.target) {
                    resolveOffsets(element, info, options);
                }
            },
            notify: () => onScroll(info),
        };
    }

    const scrollListeners = new WeakMap();
    const resizeListeners = new WeakMap();
    const onScrollHandlers = new WeakMap();
    const getEventTarget = (element) => element === document.documentElement ? window : element;
    function scrollInfo(onScroll, { container = document.documentElement, ...options } = {}) {
        let containerHandlers = onScrollHandlers.get(container);
        /**
         * Get the onScroll handlers for this container.
         * If one isn't found, create a new one.
         */
        if (!containerHandlers) {
            containerHandlers = new Set();
            onScrollHandlers.set(container, containerHandlers);
        }
        /**
         * Create a new onScroll handler for the provided callback.
         */
        const info = createScrollInfo();
        const containerHandler = createOnScrollHandler(container, onScroll, info, options);
        containerHandlers.add(containerHandler);
        /**
         * Check if there's a scroll event listener for this container.
         * If not, create one.
         */
        if (!scrollListeners.has(container)) {
            const measureAll = () => {
                for (const handler of containerHandlers)
                    handler.measure();
            };
            const updateAll = () => {
                for (const handler of containerHandlers) {
                    handler.update(frameData.timestamp);
                }
            };
            const notifyAll = () => {
                for (const handler of containerHandlers)
                    handler.notify();
            };
            const listener = () => {
                frame.read(measureAll, false, true);
                frame.read(updateAll, false, true);
                frame.update(notifyAll, false, true);
            };
            scrollListeners.set(container, listener);
            const target = getEventTarget(container);
            window.addEventListener("resize", listener, { passive: true });
            if (container !== document.documentElement) {
                resizeListeners.set(container, resize(container, listener));
            }
            target.addEventListener("scroll", listener, { passive: true });
        }
        const listener = scrollListeners.get(container);
        frame.read(listener, false, true);
        return () => {
            var _a;
            cancelFrame(listener);
            /**
             * Check if we even have any handlers for this container.
             */
            const currentHandlers = onScrollHandlers.get(container);
            if (!currentHandlers)
                return;
            currentHandlers.delete(containerHandler);
            if (currentHandlers.size)
                return;
            /**
             * If no more handlers, remove the scroll listener too.
             */
            const scrollListener = scrollListeners.get(container);
            scrollListeners.delete(container);
            if (scrollListener) {
                getEventTarget(container).removeEventListener("scroll", scrollListener);
                (_a = resizeListeners.get(container)) === null || _a === undefined ? undefined : _a();
                window.removeEventListener("resize", scrollListener);
            }
        };
    }

    function scrollTimelineFallback({ source, container, axis = "y", }) {
        // Support legacy source argument. Deprecate later.
        if (source)
            container = source;
        // ScrollTimeline records progress as a percentage CSSUnitValue
        const currentTime = { value: 0 };
        const cancel = scrollInfo((info) => {
            currentTime.value = info[axis].progress * 100;
        }, { container, axis });
        return { currentTime, cancel };
    }
    const timelineCache = new Map();
    function getTimeline({ source, container = document.documentElement, axis = "y", } = {}) {
        // Support legacy source argument. Deprecate later.
        if (source)
            container = source;
        if (!timelineCache.has(container)) {
            timelineCache.set(container, {});
        }
        const elementCache = timelineCache.get(container);
        if (!elementCache[axis]) {
            elementCache[axis] = supportsScrollTimeline()
                ? new ScrollTimeline({ source: container, axis })
                : scrollTimelineFallback({ source: container, axis });
        }
        return elementCache[axis];
    }
    /**
     * If the onScroll function has two arguments, it's expecting
     * more specific information about the scroll from scrollInfo.
     */
    function isOnScrollWithInfo(onScroll) {
        return onScroll.length === 2;
    }
    /**
     * Currently, we only support element tracking with `scrollInfo`, though in
     * the future we can also offer ViewTimeline support.
     */
    function needsElementTracking(options) {
        return options && (options.target || options.offset);
    }
    function scrollFunction(onScroll, options) {
        if (isOnScrollWithInfo(onScroll) || needsElementTracking(options)) {
            return scrollInfo((info) => {
                onScroll(info[options.axis].progress, info);
            }, options);
        }
        else {
            return observeTimeline(onScroll, getTimeline(options));
        }
    }
    function scrollAnimation(animation, options) {
        animation.flatten();
        if (needsElementTracking(options)) {
            animation.pause();
            return scrollInfo((info) => {
                animation.time = animation.duration * info[options.axis].progress;
            }, options);
        }
        else {
            const timeline = getTimeline(options);
            if (animation.attachTimeline) {
                return animation.attachTimeline(timeline, (valueAnimation) => {
                    valueAnimation.pause();
                    return observeTimeline((progress) => {
                        valueAnimation.time = valueAnimation.duration * progress;
                    }, timeline);
                });
            }
            else {
                return noop;
            }
        }
    }
    function scroll(onScroll, { axis = "y", ...options } = {}) {
        const optionsWithDefaults = { axis, ...options };
        return typeof onScroll === "function"
            ? scrollFunction(onScroll, optionsWithDefaults)
            : scrollAnimation(onScroll, optionsWithDefaults);
    }

    const thresholds = {
        some: 0,
        all: 1,
    };
    function inView(elementOrSelector, onStart, { root, margin: rootMargin, amount = "some" } = {}) {
        const elements = resolveElements(elementOrSelector);
        const activeIntersections = new WeakMap();
        const onIntersectionChange = (entries) => {
            entries.forEach((entry) => {
                const onEnd = activeIntersections.get(entry.target);
                /**
                 * If there's no change to the intersection, we don't need to
                 * do anything here.
                 */
                if (entry.isIntersecting === Boolean(onEnd))
                    return;
                if (entry.isIntersecting) {
                    const newOnEnd = onStart(entry.target, entry);
                    if (typeof newOnEnd === "function") {
                        activeIntersections.set(entry.target, newOnEnd);
                    }
                    else {
                        observer.unobserve(entry.target);
                    }
                }
                else if (typeof onEnd === "function") {
                    onEnd(entry);
                    activeIntersections.delete(entry.target);
                }
            });
        };
        const observer = new IntersectionObserver(onIntersectionChange, {
            root,
            rootMargin,
            threshold: typeof amount === "number" ? amount : thresholds[amount],
        });
        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }

    function Animete(elname){
        inView( '.animate', (el) => {
            animate([
                [ el, { rotate: 90, opacity: 0 }, { duration: 0 }],
                [ el, { rotate: 0, opacity: 1  }, { duration: 1 }]
            ]);
            // animate( element, { x: 0 }, { duration: 2 } );
            return () => {
                animate( el, { x: 0 }, { duration: 2 } );
            }
        });
    }

    function Banner() {
        jQuery(document).ready(function($) {
            var slides = $(".banner");
            if (slides.length > 1) {
                let index = 0;
        
                function showSlide(i) {
                    slides.eq(i-1).fadeOut(1000);
                    slides.eq(i).fadeIn(1000);
                    // slides.eq(i-1).fadeOut(1000, function() {
                    //     slides.eq(i).fadeIn(1000);
                    // });
                }
                slides.hide();
                showSlide(index);
        
                setInterval(function() {
                    index = (index + 1) % slides.length;
                    showSlide(index);
                }, 6000);
            }
        });
    }

    function Nav() {
        const navMenu = document.querySelector('.nav-menu');
        const navUl = document.querySelector('.nav-ul');
        if(!navMenu || !navUl) return;
        window.addEventListener('load', () => {
            if (window.innerWidth < 768) {
                navUl.style.display = 'none';
                return
            }
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768) {
                navUl.style.display = 'none';
                return
            } else {
                navUl.removeAttribute('style');
                return
            }
        });
        navMenu.addEventListener('click', () => {
            if (navUl.style.display === 'block') {
                navUl.style.display = 'none';
                return
            } else {
                navUl.style.display = 'block';
                return
            }
        });
    }

    function Navbar(){
        jQuery(document).ready(function($) {
            $(".mega-dropdown > a").click(function(e) {
                e.preventDefault();
                $(this).next(".mega-submenu").slideToggle();
            });
        });    
    }

    // packages/alpinejs/src/scheduler.js
    var flushPending = false;
    var flushing = false;
    var queue = [];
    var lastFlushedIndex = -1;
    function scheduler(callback) {
      queueJob(callback);
    }
    function queueJob(job) {
      if (!queue.includes(job))
        queue.push(job);
      queueFlush();
    }
    function dequeueJob(job) {
      let index = queue.indexOf(job);
      if (index !== -1 && index > lastFlushedIndex)
        queue.splice(index, 1);
    }
    function queueFlush() {
      if (!flushing && !flushPending) {
        flushPending = true;
        queueMicrotask(flushJobs);
      }
    }
    function flushJobs() {
      flushPending = false;
      flushing = true;
      for (let i = 0; i < queue.length; i++) {
        queue[i]();
        lastFlushedIndex = i;
      }
      queue.length = 0;
      lastFlushedIndex = -1;
      flushing = false;
    }

    // packages/alpinejs/src/reactivity.js
    var reactive;
    var effect;
    var release;
    var raw;
    var shouldSchedule = true;
    function disableEffectScheduling(callback) {
      shouldSchedule = false;
      callback();
      shouldSchedule = true;
    }
    function setReactivityEngine(engine) {
      reactive = engine.reactive;
      release = engine.release;
      effect = (callback) => engine.effect(callback, { scheduler: (task) => {
        if (shouldSchedule) {
          scheduler(task);
        } else {
          task();
        }
      } });
      raw = engine.raw;
    }
    function overrideEffect(override) {
      effect = override;
    }
    function elementBoundEffect(el) {
      let cleanup2 = () => {
      };
      let wrappedEffect = (callback) => {
        let effectReference = effect(callback);
        if (!el._x_effects) {
          el._x_effects = /* @__PURE__ */ new Set();
          el._x_runEffects = () => {
            el._x_effects.forEach((i) => i());
          };
        }
        el._x_effects.add(effectReference);
        cleanup2 = () => {
          if (effectReference === undefined)
            return;
          el._x_effects.delete(effectReference);
          release(effectReference);
        };
        return effectReference;
      };
      return [wrappedEffect, () => {
        cleanup2();
      }];
    }
    function watch(getter, callback) {
      let firstTime = true;
      let oldValue;
      let effectReference = effect(() => {
        let value = getter();
        JSON.stringify(value);
        if (!firstTime) {
          queueMicrotask(() => {
            callback(value, oldValue);
            oldValue = value;
          });
        } else {
          oldValue = value;
        }
        firstTime = false;
      });
      return () => release(effectReference);
    }

    // packages/alpinejs/src/mutation.js
    var onAttributeAddeds = [];
    var onElRemoveds = [];
    var onElAddeds = [];
    function onElAdded(callback) {
      onElAddeds.push(callback);
    }
    function onElRemoved(el, callback) {
      if (typeof callback === "function") {
        if (!el._x_cleanups)
          el._x_cleanups = [];
        el._x_cleanups.push(callback);
      } else {
        callback = el;
        onElRemoveds.push(callback);
      }
    }
    function onAttributesAdded(callback) {
      onAttributeAddeds.push(callback);
    }
    function onAttributeRemoved(el, name, callback) {
      if (!el._x_attributeCleanups)
        el._x_attributeCleanups = {};
      if (!el._x_attributeCleanups[name])
        el._x_attributeCleanups[name] = [];
      el._x_attributeCleanups[name].push(callback);
    }
    function cleanupAttributes(el, names) {
      if (!el._x_attributeCleanups)
        return;
      Object.entries(el._x_attributeCleanups).forEach(([name, value]) => {
        if (names === undefined || names.includes(name)) {
          value.forEach((i) => i());
          delete el._x_attributeCleanups[name];
        }
      });
    }
    function cleanupElement(el) {
      el._x_effects?.forEach(dequeueJob);
      while (el._x_cleanups?.length)
        el._x_cleanups.pop()();
    }
    var observer = new MutationObserver(onMutate);
    var currentlyObserving = false;
    function startObservingMutations() {
      observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
      currentlyObserving = true;
    }
    function stopObservingMutations() {
      flushObserver();
      observer.disconnect();
      currentlyObserving = false;
    }
    var queuedMutations = [];
    function flushObserver() {
      let records = observer.takeRecords();
      queuedMutations.push(() => records.length > 0 && onMutate(records));
      let queueLengthWhenTriggered = queuedMutations.length;
      queueMicrotask(() => {
        if (queuedMutations.length === queueLengthWhenTriggered) {
          while (queuedMutations.length > 0)
            queuedMutations.shift()();
        }
      });
    }
    function mutateDom(callback) {
      if (!currentlyObserving)
        return callback();
      stopObservingMutations();
      let result = callback();
      startObservingMutations();
      return result;
    }
    var isCollecting = false;
    var deferredMutations = [];
    function deferMutations() {
      isCollecting = true;
    }
    function flushAndStopDeferringMutations() {
      isCollecting = false;
      onMutate(deferredMutations);
      deferredMutations = [];
    }
    function onMutate(mutations) {
      if (isCollecting) {
        deferredMutations = deferredMutations.concat(mutations);
        return;
      }
      let addedNodes = [];
      let removedNodes = /* @__PURE__ */ new Set();
      let addedAttributes = /* @__PURE__ */ new Map();
      let removedAttributes = /* @__PURE__ */ new Map();
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].target._x_ignoreMutationObserver)
          continue;
        if (mutations[i].type === "childList") {
          mutations[i].removedNodes.forEach((node) => {
            if (node.nodeType !== 1)
              return;
            if (!node._x_marker)
              return;
            removedNodes.add(node);
          });
          mutations[i].addedNodes.forEach((node) => {
            if (node.nodeType !== 1)
              return;
            if (removedNodes.has(node)) {
              removedNodes.delete(node);
              return;
            }
            if (node._x_marker)
              return;
            addedNodes.push(node);
          });
        }
        if (mutations[i].type === "attributes") {
          let el = mutations[i].target;
          let name = mutations[i].attributeName;
          let oldValue = mutations[i].oldValue;
          let add2 = () => {
            if (!addedAttributes.has(el))
              addedAttributes.set(el, []);
            addedAttributes.get(el).push({ name, value: el.getAttribute(name) });
          };
          let remove = () => {
            if (!removedAttributes.has(el))
              removedAttributes.set(el, []);
            removedAttributes.get(el).push(name);
          };
          if (el.hasAttribute(name) && oldValue === null) {
            add2();
          } else if (el.hasAttribute(name)) {
            remove();
            add2();
          } else {
            remove();
          }
        }
      }
      removedAttributes.forEach((attrs, el) => {
        cleanupAttributes(el, attrs);
      });
      addedAttributes.forEach((attrs, el) => {
        onAttributeAddeds.forEach((i) => i(el, attrs));
      });
      for (let node of removedNodes) {
        if (addedNodes.some((i) => i.contains(node)))
          continue;
        onElRemoveds.forEach((i) => i(node));
      }
      for (let node of addedNodes) {
        if (!node.isConnected)
          continue;
        onElAddeds.forEach((i) => i(node));
      }
      addedNodes = null;
      removedNodes = null;
      addedAttributes = null;
      removedAttributes = null;
    }

    // packages/alpinejs/src/scope.js
    function scope(node) {
      return mergeProxies(closestDataStack(node));
    }
    function addScopeToNode(node, data2, referenceNode) {
      node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
      return () => {
        node._x_dataStack = node._x_dataStack.filter((i) => i !== data2);
      };
    }
    function closestDataStack(node) {
      if (node._x_dataStack)
        return node._x_dataStack;
      if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
        return closestDataStack(node.host);
      }
      if (!node.parentNode) {
        return [];
      }
      return closestDataStack(node.parentNode);
    }
    function mergeProxies(objects) {
      return new Proxy({ objects }, mergeProxyTrap);
    }
    var mergeProxyTrap = {
      ownKeys({ objects }) {
        return Array.from(
          new Set(objects.flatMap((i) => Object.keys(i)))
        );
      },
      has({ objects }, name) {
        if (name == Symbol.unscopables)
          return false;
        return objects.some(
          (obj) => Object.prototype.hasOwnProperty.call(obj, name) || Reflect.has(obj, name)
        );
      },
      get({ objects }, name, thisProxy) {
        if (name == "toJSON")
          return collapseProxies;
        return Reflect.get(
          objects.find(
            (obj) => Reflect.has(obj, name)
          ) || {},
          name,
          thisProxy
        );
      },
      set({ objects }, name, value, thisProxy) {
        const target = objects.find(
          (obj) => Object.prototype.hasOwnProperty.call(obj, name)
        ) || objects[objects.length - 1];
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        if (descriptor?.set && descriptor?.get)
          return descriptor.set.call(thisProxy, value) || true;
        return Reflect.set(target, name, value);
      }
    };
    function collapseProxies() {
      let keys = Reflect.ownKeys(this);
      return keys.reduce((acc, key) => {
        acc[key] = Reflect.get(this, key);
        return acc;
      }, {});
    }

    // packages/alpinejs/src/interceptor.js
    function initInterceptors(data2) {
      let isObject2 = (val) => typeof val === "object" && !Array.isArray(val) && val !== null;
      let recurse = (obj, basePath = "") => {
        Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, { value, enumerable }]) => {
          if (enumerable === false || value === undefined)
            return;
          if (typeof value === "object" && value !== null && value.__v_skip)
            return;
          let path = basePath === "" ? key : `${basePath}.${key}`;
          if (typeof value === "object" && value !== null && value._x_interceptor) {
            obj[key] = value.initialize(data2, path, key);
          } else {
            if (isObject2(value) && value !== obj && !(value instanceof Element)) {
              recurse(value, path);
            }
          }
        });
      };
      return recurse(data2);
    }
    function interceptor(callback, mutateObj = () => {
    }) {
      let obj = {
        initialValue: undefined,
        _x_interceptor: true,
        initialize(data2, path, key) {
          return callback(this.initialValue, () => get(data2, path), (value) => set(data2, path, value), path, key);
        }
      };
      mutateObj(obj);
      return (initialValue) => {
        if (typeof initialValue === "object" && initialValue !== null && initialValue._x_interceptor) {
          let initialize = obj.initialize.bind(obj);
          obj.initialize = (data2, path, key) => {
            let innerValue = initialValue.initialize(data2, path, key);
            obj.initialValue = innerValue;
            return initialize(data2, path, key);
          };
        } else {
          obj.initialValue = initialValue;
        }
        return obj;
      };
    }
    function get(obj, path) {
      return path.split(".").reduce((carry, segment) => carry[segment], obj);
    }
    function set(obj, path, value) {
      if (typeof path === "string")
        path = path.split(".");
      if (path.length === 1)
        obj[path[0]] = value;
      else if (path.length === 0)
        throw error;
      else {
        if (obj[path[0]])
          return set(obj[path[0]], path.slice(1), value);
        else {
          obj[path[0]] = {};
          return set(obj[path[0]], path.slice(1), value);
        }
      }
    }

    // packages/alpinejs/src/magics.js
    var magics = {};
    function magic(name, callback) {
      magics[name] = callback;
    }
    function injectMagics(obj, el) {
      let memoizedUtilities = getUtilities(el);
      Object.entries(magics).forEach(([name, callback]) => {
        Object.defineProperty(obj, `$${name}`, {
          get() {
            return callback(el, memoizedUtilities);
          },
          enumerable: false
        });
      });
      return obj;
    }
    function getUtilities(el) {
      let [utilities, cleanup2] = getElementBoundUtilities(el);
      let utils = { interceptor, ...utilities };
      onElRemoved(el, cleanup2);
      return utils;
    }

    // packages/alpinejs/src/utils/error.js
    function tryCatch(el, expression, callback, ...args) {
      try {
        return callback(...args);
      } catch (e) {
        handleError(e, el, expression);
      }
    }
    function handleError(error2, el, expression = undefined) {
      error2 = Object.assign(
        error2 ?? { message: "No error message given." },
        { el, expression }
      );
      console.warn(`Alpine Expression Error: ${error2.message}

${expression ? 'Expression: "' + expression + '"\n\n' : ""}`, el);
      setTimeout(() => {
        throw error2;
      }, 0);
    }

    // packages/alpinejs/src/evaluator.js
    var shouldAutoEvaluateFunctions = true;
    function dontAutoEvaluateFunctions(callback) {
      let cache = shouldAutoEvaluateFunctions;
      shouldAutoEvaluateFunctions = false;
      let result = callback();
      shouldAutoEvaluateFunctions = cache;
      return result;
    }
    function evaluate(el, expression, extras = {}) {
      let result;
      evaluateLater(el, expression)((value) => result = value, extras);
      return result;
    }
    function evaluateLater(...args) {
      return theEvaluatorFunction(...args);
    }
    var theEvaluatorFunction = normalEvaluator;
    function setEvaluator(newEvaluator) {
      theEvaluatorFunction = newEvaluator;
    }
    function normalEvaluator(el, expression) {
      let overriddenMagics = {};
      injectMagics(overriddenMagics, el);
      let dataStack = [overriddenMagics, ...closestDataStack(el)];
      let evaluator = typeof expression === "function" ? generateEvaluatorFromFunction(dataStack, expression) : generateEvaluatorFromString(dataStack, expression, el);
      return tryCatch.bind(null, el, expression, evaluator);
    }
    function generateEvaluatorFromFunction(dataStack, func) {
      return (receiver = () => {
      }, { scope: scope2 = {}, params = [] } = {}) => {
        let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
        runIfTypeOfFunction(receiver, result);
      };
    }
    var evaluatorMemo = {};
    function generateFunctionFromString(expression, el) {
      if (evaluatorMemo[expression]) {
        return evaluatorMemo[expression];
      }
      let AsyncFunction = Object.getPrototypeOf(async function() {
      }).constructor;
      let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression.trim()) || /^(let|const)\s/.test(expression.trim()) ? `(async()=>{ ${expression} })()` : expression;
      const safeAsyncFunction = () => {
        try {
          let func2 = new AsyncFunction(
            ["__self", "scope"],
            `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`
          );
          Object.defineProperty(func2, "name", {
            value: `[Alpine] ${expression}`
          });
          return func2;
        } catch (error2) {
          handleError(error2, el, expression);
          return Promise.resolve();
        }
      };
      let func = safeAsyncFunction();
      evaluatorMemo[expression] = func;
      return func;
    }
    function generateEvaluatorFromString(dataStack, expression, el) {
      let func = generateFunctionFromString(expression, el);
      return (receiver = () => {
      }, { scope: scope2 = {}, params = [] } = {}) => {
        func.result = undefined;
        func.finished = false;
        let completeScope = mergeProxies([scope2, ...dataStack]);
        if (typeof func === "function") {
          let promise = func(func, completeScope).catch((error2) => handleError(error2, el, expression));
          if (func.finished) {
            runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
            func.result = undefined;
          } else {
            promise.then((result) => {
              runIfTypeOfFunction(receiver, result, completeScope, params, el);
            }).catch((error2) => handleError(error2, el, expression)).finally(() => func.result = undefined);
          }
        }
      };
    }
    function runIfTypeOfFunction(receiver, value, scope2, params, el) {
      if (shouldAutoEvaluateFunctions && typeof value === "function") {
        let result = value.apply(scope2, params);
        if (result instanceof Promise) {
          result.then((i) => runIfTypeOfFunction(receiver, i, scope2, params)).catch((error2) => handleError(error2, el, value));
        } else {
          receiver(result);
        }
      } else if (typeof value === "object" && value instanceof Promise) {
        value.then((i) => receiver(i));
      } else {
        receiver(value);
      }
    }

    // packages/alpinejs/src/directives.js
    var prefixAsString = "x-";
    function prefix(subject = "") {
      return prefixAsString + subject;
    }
    function setPrefix(newPrefix) {
      prefixAsString = newPrefix;
    }
    var directiveHandlers = {};
    function directive(name, callback) {
      directiveHandlers[name] = callback;
      return {
        before(directive2) {
          if (!directiveHandlers[directive2]) {
            console.warn(String.raw`Cannot find directive \`${directive2}\`. \`${name}\` will use the default order of execution`);
            return;
          }
          const pos = directiveOrder.indexOf(directive2);
          directiveOrder.splice(pos >= 0 ? pos : directiveOrder.indexOf("DEFAULT"), 0, name);
        }
      };
    }
    function directiveExists(name) {
      return Object.keys(directiveHandlers).includes(name);
    }
    function directives(el, attributes, originalAttributeOverride) {
      attributes = Array.from(attributes);
      if (el._x_virtualDirectives) {
        let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) => ({ name, value }));
        let staticAttributes = attributesOnly(vAttributes);
        vAttributes = vAttributes.map((attribute) => {
          if (staticAttributes.find((attr) => attr.name === attribute.name)) {
            return {
              name: `x-bind:${attribute.name}`,
              value: `"${attribute.value}"`
            };
          }
          return attribute;
        });
        attributes = attributes.concat(vAttributes);
      }
      let transformedAttributeMap = {};
      let directives2 = attributes.map(toTransformedAttributes((newName, oldName) => transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
      return directives2.map((directive2) => {
        return getDirectiveHandler(el, directive2);
      });
    }
    function attributesOnly(attributes) {
      return Array.from(attributes).map(toTransformedAttributes()).filter((attr) => !outNonAlpineAttributes(attr));
    }
    var isDeferringHandlers = false;
    var directiveHandlerStacks = /* @__PURE__ */ new Map();
    var currentHandlerStackKey = Symbol();
    function deferHandlingDirectives(callback) {
      isDeferringHandlers = true;
      let key = Symbol();
      currentHandlerStackKey = key;
      directiveHandlerStacks.set(key, []);
      let flushHandlers = () => {
        while (directiveHandlerStacks.get(key).length)
          directiveHandlerStacks.get(key).shift()();
        directiveHandlerStacks.delete(key);
      };
      let stopDeferring = () => {
        isDeferringHandlers = false;
        flushHandlers();
      };
      callback(flushHandlers);
      stopDeferring();
    }
    function getElementBoundUtilities(el) {
      let cleanups = [];
      let cleanup2 = (callback) => cleanups.push(callback);
      let [effect3, cleanupEffect] = elementBoundEffect(el);
      cleanups.push(cleanupEffect);
      let utilities = {
        Alpine: alpine_default,
        effect: effect3,
        cleanup: cleanup2,
        evaluateLater: evaluateLater.bind(evaluateLater, el),
        evaluate: evaluate.bind(evaluate, el)
      };
      let doCleanup = () => cleanups.forEach((i) => i());
      return [utilities, doCleanup];
    }
    function getDirectiveHandler(el, directive2) {
      let noop = () => {
      };
      let handler4 = directiveHandlers[directive2.type] || noop;
      let [utilities, cleanup2] = getElementBoundUtilities(el);
      onAttributeRemoved(el, directive2.original, cleanup2);
      let fullHandler = () => {
        if (el._x_ignore || el._x_ignoreSelf)
          return;
        handler4.inline && handler4.inline(el, directive2, utilities);
        handler4 = handler4.bind(handler4, el, directive2, utilities);
        isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
      };
      fullHandler.runCleanups = cleanup2;
      return fullHandler;
    }
    var startingWith = (subject, replacement) => ({ name, value }) => {
      if (name.startsWith(subject))
        name = name.replace(subject, replacement);
      return { name, value };
    };
    var into = (i) => i;
    function toTransformedAttributes(callback = () => {
    }) {
      return ({ name, value }) => {
        let { name: newName, value: newValue } = attributeTransformers.reduce((carry, transform) => {
          return transform(carry);
        }, { name, value });
        if (newName !== name)
          callback(newName, name);
        return { name: newName, value: newValue };
      };
    }
    var attributeTransformers = [];
    function mapAttributes(callback) {
      attributeTransformers.push(callback);
    }
    function outNonAlpineAttributes({ name }) {
      return alpineAttributeRegex().test(name);
    }
    var alpineAttributeRegex = () => new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
    function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
      return ({ name, value }) => {
        let typeMatch = name.match(alpineAttributeRegex());
        let valueMatch = name.match(/:([a-zA-Z0-9\-_:]+)/);
        let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
        let original = originalAttributeOverride || transformedAttributeMap[name] || name;
        return {
          type: typeMatch ? typeMatch[1] : null,
          value: valueMatch ? valueMatch[1] : null,
          modifiers: modifiers.map((i) => i.replace(".", "")),
          expression: value,
          original
        };
      };
    }
    var DEFAULT = "DEFAULT";
    var directiveOrder = [
      "ignore",
      "ref",
      "data",
      "id",
      "anchor",
      "bind",
      "init",
      "for",
      "model",
      "modelable",
      "transition",
      "show",
      "if",
      DEFAULT,
      "teleport"
    ];
    function byPriority(a, b) {
      let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
      let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
      return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
    }

    // packages/alpinejs/src/utils/dispatch.js
    function dispatch(el, name, detail = {}) {
      el.dispatchEvent(
        new CustomEvent(name, {
          detail,
          bubbles: true,
          // Allows events to pass the shadow DOM barrier.
          composed: true,
          cancelable: true
        })
      );
    }

    // packages/alpinejs/src/utils/walk.js
    function walk(el, callback) {
      if (typeof ShadowRoot === "function" && el instanceof ShadowRoot) {
        Array.from(el.children).forEach((el2) => walk(el2, callback));
        return;
      }
      let skip = false;
      callback(el, () => skip = true);
      if (skip)
        return;
      let node = el.firstElementChild;
      while (node) {
        walk(node, callback);
        node = node.nextElementSibling;
      }
    }

    // packages/alpinejs/src/utils/warn.js
    function warn(message, ...args) {
      console.warn(`Alpine Warning: ${message}`, ...args);
    }

    // packages/alpinejs/src/lifecycle.js
    var started = false;
    function start() {
      if (started)
        warn("Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.");
      started = true;
      if (!document.body)
        warn("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
      dispatch(document, "alpine:init");
      dispatch(document, "alpine:initializing");
      startObservingMutations();
      onElAdded((el) => initTree(el, walk));
      onElRemoved((el) => destroyTree(el));
      onAttributesAdded((el, attrs) => {
        directives(el, attrs).forEach((handle) => handle());
      });
      let outNestedComponents = (el) => !closestRoot(el.parentElement, true);
      Array.from(document.querySelectorAll(allSelectors().join(","))).filter(outNestedComponents).forEach((el) => {
        initTree(el);
      });
      dispatch(document, "alpine:initialized");
      setTimeout(() => {
        warnAboutMissingPlugins();
      });
    }
    var rootSelectorCallbacks = [];
    var initSelectorCallbacks = [];
    function rootSelectors() {
      return rootSelectorCallbacks.map((fn) => fn());
    }
    function allSelectors() {
      return rootSelectorCallbacks.concat(initSelectorCallbacks).map((fn) => fn());
    }
    function addRootSelector(selectorCallback) {
      rootSelectorCallbacks.push(selectorCallback);
    }
    function addInitSelector(selectorCallback) {
      initSelectorCallbacks.push(selectorCallback);
    }
    function closestRoot(el, includeInitSelectors = false) {
      return findClosest(el, (element) => {
        const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
        if (selectors.some((selector) => element.matches(selector)))
          return true;
      });
    }
    function findClosest(el, callback) {
      if (!el)
        return;
      if (callback(el))
        return el;
      if (el._x_teleportBack)
        el = el._x_teleportBack;
      if (!el.parentElement)
        return;
      return findClosest(el.parentElement, callback);
    }
    function isRoot(el) {
      return rootSelectors().some((selector) => el.matches(selector));
    }
    var initInterceptors2 = [];
    function interceptInit(callback) {
      initInterceptors2.push(callback);
    }
    var markerDispenser = 1;
    function initTree(el, walker = walk, intercept = () => {
    }) {
      if (findClosest(el, (i) => i._x_ignore))
        return;
      deferHandlingDirectives(() => {
        walker(el, (el2, skip) => {
          if (el2._x_marker)
            return;
          intercept(el2, skip);
          initInterceptors2.forEach((i) => i(el2, skip));
          directives(el2, el2.attributes).forEach((handle) => handle());
          if (!el2._x_ignore)
            el2._x_marker = markerDispenser++;
          el2._x_ignore && skip();
        });
      });
    }
    function destroyTree(root, walker = walk) {
      walker(root, (el) => {
        cleanupElement(el);
        cleanupAttributes(el);
        delete el._x_marker;
      });
    }
    function warnAboutMissingPlugins() {
      let pluginDirectives = [
        ["ui", "dialog", ["[x-dialog], [x-popover]"]],
        ["anchor", "anchor", ["[x-anchor]"]],
        ["sort", "sort", ["[x-sort]"]]
      ];
      pluginDirectives.forEach(([plugin2, directive2, selectors]) => {
        if (directiveExists(directive2))
          return;
        selectors.some((selector) => {
          if (document.querySelector(selector)) {
            warn(`found "${selector}", but missing ${plugin2} plugin`);
            return true;
          }
        });
      });
    }

    // packages/alpinejs/src/nextTick.js
    var tickStack = [];
    var isHolding = false;
    function nextTick(callback = () => {
    }) {
      queueMicrotask(() => {
        isHolding || setTimeout(() => {
          releaseNextTicks();
        });
      });
      return new Promise((res) => {
        tickStack.push(() => {
          callback();
          res();
        });
      });
    }
    function releaseNextTicks() {
      isHolding = false;
      while (tickStack.length)
        tickStack.shift()();
    }
    function holdNextTicks() {
      isHolding = true;
    }

    // packages/alpinejs/src/utils/classes.js
    function setClasses(el, value) {
      if (Array.isArray(value)) {
        return setClassesFromString(el, value.join(" "));
      } else if (typeof value === "object" && value !== null) {
        return setClassesFromObject(el, value);
      } else if (typeof value === "function") {
        return setClasses(el, value());
      }
      return setClassesFromString(el, value);
    }
    function setClassesFromString(el, classString) {
      let missingClasses = (classString2) => classString2.split(" ").filter((i) => !el.classList.contains(i)).filter(Boolean);
      let addClassesAndReturnUndo = (classes) => {
        el.classList.add(...classes);
        return () => {
          el.classList.remove(...classes);
        };
      };
      classString = classString === true ? classString = "" : classString || "";
      return addClassesAndReturnUndo(missingClasses(classString));
    }
    function setClassesFromObject(el, classObject) {
      let split = (classString) => classString.split(" ").filter(Boolean);
      let forAdd = Object.entries(classObject).flatMap(([classString, bool]) => bool ? split(classString) : false).filter(Boolean);
      let forRemove = Object.entries(classObject).flatMap(([classString, bool]) => !bool ? split(classString) : false).filter(Boolean);
      let added = [];
      let removed = [];
      forRemove.forEach((i) => {
        if (el.classList.contains(i)) {
          el.classList.remove(i);
          removed.push(i);
        }
      });
      forAdd.forEach((i) => {
        if (!el.classList.contains(i)) {
          el.classList.add(i);
          added.push(i);
        }
      });
      return () => {
        removed.forEach((i) => el.classList.add(i));
        added.forEach((i) => el.classList.remove(i));
      };
    }

    // packages/alpinejs/src/utils/styles.js
    function setStyles(el, value) {
      if (typeof value === "object" && value !== null) {
        return setStylesFromObject(el, value);
      }
      return setStylesFromString(el, value);
    }
    function setStylesFromObject(el, value) {
      let previousStyles = {};
      Object.entries(value).forEach(([key, value2]) => {
        previousStyles[key] = el.style[key];
        if (!key.startsWith("--")) {
          key = kebabCase(key);
        }
        el.style.setProperty(key, value2);
      });
      setTimeout(() => {
        if (el.style.length === 0) {
          el.removeAttribute("style");
        }
      });
      return () => {
        setStyles(el, previousStyles);
      };
    }
    function setStylesFromString(el, value) {
      let cache = el.getAttribute("style", value);
      el.setAttribute("style", value);
      return () => {
        el.setAttribute("style", cache || "");
      };
    }
    function kebabCase(subject) {
      return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }

    // packages/alpinejs/src/utils/once.js
    function once(callback, fallback = () => {
    }) {
      let called = false;
      return function() {
        if (!called) {
          called = true;
          callback.apply(this, arguments);
        } else {
          fallback.apply(this, arguments);
        }
      };
    }

    // packages/alpinejs/src/directives/x-transition.js
    directive("transition", (el, { value, modifiers, expression }, { evaluate: evaluate2 }) => {
      if (typeof expression === "function")
        expression = evaluate2(expression);
      if (expression === false)
        return;
      if (!expression || typeof expression === "boolean") {
        registerTransitionsFromHelper(el, modifiers, value);
      } else {
        registerTransitionsFromClassString(el, expression, value);
      }
    });
    function registerTransitionsFromClassString(el, classString, stage) {
      registerTransitionObject(el, setClasses, "");
      let directiveStorageMap = {
        "enter": (classes) => {
          el._x_transition.enter.during = classes;
        },
        "enter-start": (classes) => {
          el._x_transition.enter.start = classes;
        },
        "enter-end": (classes) => {
          el._x_transition.enter.end = classes;
        },
        "leave": (classes) => {
          el._x_transition.leave.during = classes;
        },
        "leave-start": (classes) => {
          el._x_transition.leave.start = classes;
        },
        "leave-end": (classes) => {
          el._x_transition.leave.end = classes;
        }
      };
      directiveStorageMap[stage](classString);
    }
    function registerTransitionsFromHelper(el, modifiers, stage) {
      registerTransitionObject(el, setStyles);
      let doesntSpecify = !modifiers.includes("in") && !modifiers.includes("out") && !stage;
      let transitioningIn = doesntSpecify || modifiers.includes("in") || ["enter"].includes(stage);
      let transitioningOut = doesntSpecify || modifiers.includes("out") || ["leave"].includes(stage);
      if (modifiers.includes("in") && !doesntSpecify) {
        modifiers = modifiers.filter((i, index) => index < modifiers.indexOf("out"));
      }
      if (modifiers.includes("out") && !doesntSpecify) {
        modifiers = modifiers.filter((i, index) => index > modifiers.indexOf("out"));
      }
      let wantsAll = !modifiers.includes("opacity") && !modifiers.includes("scale");
      let wantsOpacity = wantsAll || modifiers.includes("opacity");
      let wantsScale = wantsAll || modifiers.includes("scale");
      let opacityValue = wantsOpacity ? 0 : 1;
      let scaleValue = wantsScale ? modifierValue(modifiers, "scale", 95) / 100 : 1;
      let delay = modifierValue(modifiers, "delay", 0) / 1e3;
      let origin = modifierValue(modifiers, "origin", "center");
      let property = "opacity, transform";
      let durationIn = modifierValue(modifiers, "duration", 150) / 1e3;
      let durationOut = modifierValue(modifiers, "duration", 75) / 1e3;
      let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;
      if (transitioningIn) {
        el._x_transition.enter.during = {
          transformOrigin: origin,
          transitionDelay: `${delay}s`,
          transitionProperty: property,
          transitionDuration: `${durationIn}s`,
          transitionTimingFunction: easing
        };
        el._x_transition.enter.start = {
          opacity: opacityValue,
          transform: `scale(${scaleValue})`
        };
        el._x_transition.enter.end = {
          opacity: 1,
          transform: `scale(1)`
        };
      }
      if (transitioningOut) {
        el._x_transition.leave.during = {
          transformOrigin: origin,
          transitionDelay: `${delay}s`,
          transitionProperty: property,
          transitionDuration: `${durationOut}s`,
          transitionTimingFunction: easing
        };
        el._x_transition.leave.start = {
          opacity: 1,
          transform: `scale(1)`
        };
        el._x_transition.leave.end = {
          opacity: opacityValue,
          transform: `scale(${scaleValue})`
        };
      }
    }
    function registerTransitionObject(el, setFunction, defaultValue = {}) {
      if (!el._x_transition)
        el._x_transition = {
          enter: { during: defaultValue, start: defaultValue, end: defaultValue },
          leave: { during: defaultValue, start: defaultValue, end: defaultValue },
          in(before = () => {
          }, after = () => {
          }) {
            transition(el, setFunction, {
              during: this.enter.during,
              start: this.enter.start,
              end: this.enter.end
            }, before, after);
          },
          out(before = () => {
          }, after = () => {
          }) {
            transition(el, setFunction, {
              during: this.leave.during,
              start: this.leave.start,
              end: this.leave.end
            }, before, after);
          }
        };
    }
    window.Element.prototype._x_toggleAndCascadeWithTransitions = function(el, value, show, hide) {
      const nextTick2 = document.visibilityState === "visible" ? requestAnimationFrame : setTimeout;
      let clickAwayCompatibleShow = () => nextTick2(show);
      if (value) {
        if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
          el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
        } else {
          el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
        }
        return;
      }
      el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) => {
        el._x_transition.out(() => {
        }, () => resolve(hide));
        el._x_transitioning && el._x_transitioning.beforeCancel(() => reject({ isFromCancelledTransition: true }));
      }) : Promise.resolve(hide);
      queueMicrotask(() => {
        let closest = closestHide(el);
        if (closest) {
          if (!closest._x_hideChildren)
            closest._x_hideChildren = [];
          closest._x_hideChildren.push(el);
        } else {
          nextTick2(() => {
            let hideAfterChildren = (el2) => {
              let carry = Promise.all([
                el2._x_hidePromise,
                ...(el2._x_hideChildren || []).map(hideAfterChildren)
              ]).then(([i]) => i?.());
              delete el2._x_hidePromise;
              delete el2._x_hideChildren;
              return carry;
            };
            hideAfterChildren(el).catch((e) => {
              if (!e.isFromCancelledTransition)
                throw e;
            });
          });
        }
      });
    };
    function closestHide(el) {
      let parent = el.parentNode;
      if (!parent)
        return;
      return parent._x_hidePromise ? parent : closestHide(parent);
    }
    function transition(el, setFunction, { during, start: start2, end } = {}, before = () => {
    }, after = () => {
    }) {
      if (el._x_transitioning)
        el._x_transitioning.cancel();
      if (Object.keys(during).length === 0 && Object.keys(start2).length === 0 && Object.keys(end).length === 0) {
        before();
        after();
        return;
      }
      let undoStart, undoDuring, undoEnd;
      performTransition(el, {
        start() {
          undoStart = setFunction(el, start2);
        },
        during() {
          undoDuring = setFunction(el, during);
        },
        before,
        end() {
          undoStart();
          undoEnd = setFunction(el, end);
        },
        after,
        cleanup() {
          undoDuring();
          undoEnd();
        }
      });
    }
    function performTransition(el, stages) {
      let interrupted, reachedBefore, reachedEnd;
      let finish = once(() => {
        mutateDom(() => {
          interrupted = true;
          if (!reachedBefore)
            stages.before();
          if (!reachedEnd) {
            stages.end();
            releaseNextTicks();
          }
          stages.after();
          if (el.isConnected)
            stages.cleanup();
          delete el._x_transitioning;
        });
      });
      el._x_transitioning = {
        beforeCancels: [],
        beforeCancel(callback) {
          this.beforeCancels.push(callback);
        },
        cancel: once(function() {
          while (this.beforeCancels.length) {
            this.beforeCancels.shift()();
          }
          finish();
        }),
        finish
      };
      mutateDom(() => {
        stages.start();
        stages.during();
      });
      holdNextTicks();
      requestAnimationFrame(() => {
        if (interrupted)
          return;
        let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3;
        let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3;
        if (duration === 0)
          duration = Number(getComputedStyle(el).animationDuration.replace("s", "")) * 1e3;
        mutateDom(() => {
          stages.before();
        });
        reachedBefore = true;
        requestAnimationFrame(() => {
          if (interrupted)
            return;
          mutateDom(() => {
            stages.end();
          });
          releaseNextTicks();
          setTimeout(el._x_transitioning.finish, duration + delay);
          reachedEnd = true;
        });
      });
    }
    function modifierValue(modifiers, key, fallback) {
      if (modifiers.indexOf(key) === -1)
        return fallback;
      const rawValue = modifiers[modifiers.indexOf(key) + 1];
      if (!rawValue)
        return fallback;
      if (key === "scale") {
        if (isNaN(rawValue))
          return fallback;
      }
      if (key === "duration" || key === "delay") {
        let match = rawValue.match(/([0-9]+)ms/);
        if (match)
          return match[1];
      }
      if (key === "origin") {
        if (["top", "right", "left", "center", "bottom"].includes(modifiers[modifiers.indexOf(key) + 2])) {
          return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(" ");
        }
      }
      return rawValue;
    }

    // packages/alpinejs/src/clone.js
    var isCloning = false;
    function skipDuringClone(callback, fallback = () => {
    }) {
      return (...args) => isCloning ? fallback(...args) : callback(...args);
    }
    function onlyDuringClone(callback) {
      return (...args) => isCloning && callback(...args);
    }
    var interceptors = [];
    function interceptClone(callback) {
      interceptors.push(callback);
    }
    function cloneNode(from, to) {
      interceptors.forEach((i) => i(from, to));
      isCloning = true;
      dontRegisterReactiveSideEffects(() => {
        initTree(to, (el, callback) => {
          callback(el, () => {
          });
        });
      });
      isCloning = false;
    }
    var isCloningLegacy = false;
    function clone(oldEl, newEl) {
      if (!newEl._x_dataStack)
        newEl._x_dataStack = oldEl._x_dataStack;
      isCloning = true;
      isCloningLegacy = true;
      dontRegisterReactiveSideEffects(() => {
        cloneTree(newEl);
      });
      isCloning = false;
      isCloningLegacy = false;
    }
    function cloneTree(el) {
      let hasRunThroughFirstEl = false;
      let shallowWalker = (el2, callback) => {
        walk(el2, (el3, skip) => {
          if (hasRunThroughFirstEl && isRoot(el3))
            return skip();
          hasRunThroughFirstEl = true;
          callback(el3, skip);
        });
      };
      initTree(el, shallowWalker);
    }
    function dontRegisterReactiveSideEffects(callback) {
      let cache = effect;
      overrideEffect((callback2, el) => {
        let storedEffect = cache(callback2);
        release(storedEffect);
        return () => {
        };
      });
      callback();
      overrideEffect(cache);
    }

    // packages/alpinejs/src/utils/bind.js
    function bind(el, name, value, modifiers = []) {
      if (!el._x_bindings)
        el._x_bindings = reactive({});
      el._x_bindings[name] = value;
      name = modifiers.includes("camel") ? camelCase(name) : name;
      switch (name) {
        case "value":
          bindInputValue(el, value);
          break;
        case "style":
          bindStyles(el, value);
          break;
        case "class":
          bindClasses(el, value);
          break;
        case "selected":
        case "checked":
          bindAttributeAndProperty(el, name, value);
          break;
        default:
          bindAttribute(el, name, value);
          break;
      }
    }
    function bindInputValue(el, value) {
      if (isRadio(el)) {
        if (el.attributes.value === undefined) {
          el.value = value;
        }
        if (window.fromModel) {
          if (typeof value === "boolean") {
            el.checked = safeParseBoolean(el.value) === value;
          } else {
            el.checked = checkedAttrLooseCompare(el.value, value);
          }
        }
      } else if (isCheckbox(el)) {
        if (Number.isInteger(value)) {
          el.value = value;
        } else if (!Array.isArray(value) && typeof value !== "boolean" && ![null, undefined].includes(value)) {
          el.value = String(value);
        } else {
          if (Array.isArray(value)) {
            el.checked = value.some((val) => checkedAttrLooseCompare(val, el.value));
          } else {
            el.checked = !!value;
          }
        }
      } else if (el.tagName === "SELECT") {
        updateSelect(el, value);
      } else {
        if (el.value === value)
          return;
        el.value = value === undefined ? "" : value;
      }
    }
    function bindClasses(el, value) {
      if (el._x_undoAddedClasses)
        el._x_undoAddedClasses();
      el._x_undoAddedClasses = setClasses(el, value);
    }
    function bindStyles(el, value) {
      if (el._x_undoAddedStyles)
        el._x_undoAddedStyles();
      el._x_undoAddedStyles = setStyles(el, value);
    }
    function bindAttributeAndProperty(el, name, value) {
      bindAttribute(el, name, value);
      setPropertyIfChanged(el, name, value);
    }
    function bindAttribute(el, name, value) {
      if ([null, undefined, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
        el.removeAttribute(name);
      } else {
        if (isBooleanAttr(name))
          value = name;
        setIfChanged(el, name, value);
      }
    }
    function setIfChanged(el, attrName, value) {
      if (el.getAttribute(attrName) != value) {
        el.setAttribute(attrName, value);
      }
    }
    function setPropertyIfChanged(el, propName, value) {
      if (el[propName] !== value) {
        el[propName] = value;
      }
    }
    function updateSelect(el, value) {
      const arrayWrappedValue = [].concat(value).map((value2) => {
        return value2 + "";
      });
      Array.from(el.options).forEach((option) => {
        option.selected = arrayWrappedValue.includes(option.value);
      });
    }
    function camelCase(subject) {
      return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
    }
    function checkedAttrLooseCompare(valueA, valueB) {
      return valueA == valueB;
    }
    function safeParseBoolean(rawValue) {
      if ([1, "1", "true", "on", "yes", true].includes(rawValue)) {
        return true;
      }
      if ([0, "0", "false", "off", "no", false].includes(rawValue)) {
        return false;
      }
      return rawValue ? Boolean(rawValue) : null;
    }
    var booleanAttributes = /* @__PURE__ */ new Set([
      "allowfullscreen",
      "async",
      "autofocus",
      "autoplay",
      "checked",
      "controls",
      "default",
      "defer",
      "disabled",
      "formnovalidate",
      "inert",
      "ismap",
      "itemscope",
      "loop",
      "multiple",
      "muted",
      "nomodule",
      "novalidate",
      "open",
      "playsinline",
      "readonly",
      "required",
      "reversed",
      "selected",
      "shadowrootclonable",
      "shadowrootdelegatesfocus",
      "shadowrootserializable"
    ]);
    function isBooleanAttr(attrName) {
      return booleanAttributes.has(attrName);
    }
    function attributeShouldntBePreservedIfFalsy(name) {
      return !["aria-pressed", "aria-checked", "aria-expanded", "aria-selected"].includes(name);
    }
    function getBinding(el, name, fallback) {
      if (el._x_bindings && el._x_bindings[name] !== undefined)
        return el._x_bindings[name];
      return getAttributeBinding(el, name, fallback);
    }
    function extractProp(el, name, fallback, extract = true) {
      if (el._x_bindings && el._x_bindings[name] !== undefined)
        return el._x_bindings[name];
      if (el._x_inlineBindings && el._x_inlineBindings[name] !== undefined) {
        let binding = el._x_inlineBindings[name];
        binding.extract = extract;
        return dontAutoEvaluateFunctions(() => {
          return evaluate(el, binding.expression);
        });
      }
      return getAttributeBinding(el, name, fallback);
    }
    function getAttributeBinding(el, name, fallback) {
      let attr = el.getAttribute(name);
      if (attr === null)
        return typeof fallback === "function" ? fallback() : fallback;
      if (attr === "")
        return true;
      if (isBooleanAttr(name)) {
        return !![name, "true"].includes(attr);
      }
      return attr;
    }
    function isCheckbox(el) {
      return el.type === "checkbox" || el.localName === "ui-checkbox" || el.localName === "ui-switch";
    }
    function isRadio(el) {
      return el.type === "radio" || el.localName === "ui-radio";
    }

    // packages/alpinejs/src/utils/debounce.js
    function debounce(func, wait) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // packages/alpinejs/src/utils/throttle.js
    function throttle(func, limit) {
      let inThrottle;
      return function() {
        let context = this, args = arguments;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }

    // packages/alpinejs/src/entangle.js
    function entangle({ get: outerGet, set: outerSet }, { get: innerGet, set: innerSet }) {
      let firstRun = true;
      let outerHash;
      let reference = effect(() => {
        let outer = outerGet();
        let inner = innerGet();
        if (firstRun) {
          innerSet(cloneIfObject(outer));
          firstRun = false;
        } else {
          let outerHashLatest = JSON.stringify(outer);
          let innerHashLatest = JSON.stringify(inner);
          if (outerHashLatest !== outerHash) {
            innerSet(cloneIfObject(outer));
          } else if (outerHashLatest !== innerHashLatest) {
            outerSet(cloneIfObject(inner));
          } else ;
        }
        outerHash = JSON.stringify(outerGet());
        JSON.stringify(innerGet());
      });
      return () => {
        release(reference);
      };
    }
    function cloneIfObject(value) {
      return typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }

    // packages/alpinejs/src/plugin.js
    function plugin(callback) {
      let callbacks = Array.isArray(callback) ? callback : [callback];
      callbacks.forEach((i) => i(alpine_default));
    }

    // packages/alpinejs/src/store.js
    var stores = {};
    var isReactive = false;
    function store(name, value) {
      if (!isReactive) {
        stores = reactive(stores);
        isReactive = true;
      }
      if (value === undefined) {
        return stores[name];
      }
      stores[name] = value;
      initInterceptors(stores[name]);
      if (typeof value === "object" && value !== null && value.hasOwnProperty("init") && typeof value.init === "function") {
        stores[name].init();
      }
    }
    function getStores() {
      return stores;
    }

    // packages/alpinejs/src/binds.js
    var binds = {};
    function bind2(name, bindings) {
      let getBindings = typeof bindings !== "function" ? () => bindings : bindings;
      if (name instanceof Element) {
        return applyBindingsObject(name, getBindings());
      } else {
        binds[name] = getBindings;
      }
      return () => {
      };
    }
    function injectBindingProviders(obj) {
      Object.entries(binds).forEach(([name, callback]) => {
        Object.defineProperty(obj, name, {
          get() {
            return (...args) => {
              return callback(...args);
            };
          }
        });
      });
      return obj;
    }
    function applyBindingsObject(el, obj, original) {
      let cleanupRunners = [];
      while (cleanupRunners.length)
        cleanupRunners.pop()();
      let attributes = Object.entries(obj).map(([name, value]) => ({ name, value }));
      let staticAttributes = attributesOnly(attributes);
      attributes = attributes.map((attribute) => {
        if (staticAttributes.find((attr) => attr.name === attribute.name)) {
          return {
            name: `x-bind:${attribute.name}`,
            value: `"${attribute.value}"`
          };
        }
        return attribute;
      });
      directives(el, attributes, original).map((handle) => {
        cleanupRunners.push(handle.runCleanups);
        handle();
      });
      return () => {
        while (cleanupRunners.length)
          cleanupRunners.pop()();
      };
    }

    // packages/alpinejs/src/datas.js
    var datas = {};
    function data(name, callback) {
      datas[name] = callback;
    }
    function injectDataProviders(obj, context) {
      Object.entries(datas).forEach(([name, callback]) => {
        Object.defineProperty(obj, name, {
          get() {
            return (...args) => {
              return callback.bind(context)(...args);
            };
          },
          enumerable: false
        });
      });
      return obj;
    }

    // packages/alpinejs/src/alpine.js
    var Alpine = {
      get reactive() {
        return reactive;
      },
      get release() {
        return release;
      },
      get effect() {
        return effect;
      },
      get raw() {
        return raw;
      },
      version: "3.14.8",
      flushAndStopDeferringMutations,
      dontAutoEvaluateFunctions,
      disableEffectScheduling,
      startObservingMutations,
      stopObservingMutations,
      setReactivityEngine,
      onAttributeRemoved,
      onAttributesAdded,
      closestDataStack,
      skipDuringClone,
      onlyDuringClone,
      addRootSelector,
      addInitSelector,
      interceptClone,
      addScopeToNode,
      deferMutations,
      mapAttributes,
      evaluateLater,
      interceptInit,
      setEvaluator,
      mergeProxies,
      extractProp,
      findClosest,
      onElRemoved,
      closestRoot,
      destroyTree,
      interceptor,
      // INTERNAL: not public API and is subject to change without major release.
      transition,
      // INTERNAL
      setStyles,
      // INTERNAL
      mutateDom,
      directive,
      entangle,
      throttle,
      debounce,
      evaluate,
      initTree,
      nextTick,
      prefixed: prefix,
      prefix: setPrefix,
      plugin,
      magic,
      store,
      start,
      clone,
      // INTERNAL
      cloneNode,
      // INTERNAL
      bound: getBinding,
      $data: scope,
      watch,
      walk,
      data,
      bind: bind2
    };
    var alpine_default = Alpine;

    // node_modules/@vue/shared/dist/shared.esm-bundler.js
    function makeMap(str, expectsLowerCase) {
      const map = /* @__PURE__ */ Object.create(null);
      const list = str.split(",");
      for (let i = 0; i < list.length; i++) {
        map[list[i]] = true;
      }
      return (val) => !!map[val];
    }
    var EMPTY_OBJ = Object.freeze({}) ;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var hasOwn = (val, key) => hasOwnProperty.call(val, key);
    var isArray = Array.isArray;
    var isMap = (val) => toTypeString(val) === "[object Map]";
    var isString = (val) => typeof val === "string";
    var isSymbol = (val) => typeof val === "symbol";
    var isObject = (val) => val !== null && typeof val === "object";
    var objectToString = Object.prototype.toString;
    var toTypeString = (value) => objectToString.call(value);
    var toRawType = (value) => {
      return toTypeString(value).slice(8, -1);
    };
    var isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
    var cacheStringFunction = (fn) => {
      const cache = /* @__PURE__ */ Object.create(null);
      return (str) => {
        const hit = cache[str];
        return hit || (cache[str] = fn(str));
      };
    };
    var capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
    var hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);

    // node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
    var targetMap = /* @__PURE__ */ new WeakMap();
    var effectStack = [];
    var activeEffect;
    var ITERATE_KEY = Symbol("iterate" );
    var MAP_KEY_ITERATE_KEY = Symbol("Map key iterate" );
    function isEffect(fn) {
      return fn && fn._isEffect === true;
    }
    function effect2(fn, options = EMPTY_OBJ) {
      if (isEffect(fn)) {
        fn = fn.raw;
      }
      const effect3 = createReactiveEffect(fn, options);
      if (!options.lazy) {
        effect3();
      }
      return effect3;
    }
    function stop(effect3) {
      if (effect3.active) {
        cleanup(effect3);
        if (effect3.options.onStop) {
          effect3.options.onStop();
        }
        effect3.active = false;
      }
    }
    var uid = 0;
    function createReactiveEffect(fn, options) {
      const effect3 = function reactiveEffect() {
        if (!effect3.active) {
          return fn();
        }
        if (!effectStack.includes(effect3)) {
          cleanup(effect3);
          try {
            enableTracking();
            effectStack.push(effect3);
            activeEffect = effect3;
            return fn();
          } finally {
            effectStack.pop();
            resetTracking();
            activeEffect = effectStack[effectStack.length - 1];
          }
        }
      };
      effect3.id = uid++;
      effect3.allowRecurse = !!options.allowRecurse;
      effect3._isEffect = true;
      effect3.active = true;
      effect3.raw = fn;
      effect3.deps = [];
      effect3.options = options;
      return effect3;
    }
    function cleanup(effect3) {
      const { deps } = effect3;
      if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
          deps[i].delete(effect3);
        }
        deps.length = 0;
      }
    }
    var shouldTrack = true;
    var trackStack = [];
    function pauseTracking() {
      trackStack.push(shouldTrack);
      shouldTrack = false;
    }
    function enableTracking() {
      trackStack.push(shouldTrack);
      shouldTrack = true;
    }
    function resetTracking() {
      const last = trackStack.pop();
      shouldTrack = last === undefined ? true : last;
    }
    function track(target, type, key) {
      if (!shouldTrack || activeEffect === undefined) {
        return;
      }
      let depsMap = targetMap.get(target);
      if (!depsMap) {
        targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
      }
      let dep = depsMap.get(key);
      if (!dep) {
        depsMap.set(key, dep = /* @__PURE__ */ new Set());
      }
      if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
        if (activeEffect.options.onTrack) {
          activeEffect.options.onTrack({
            effect: activeEffect,
            target,
            type,
            key
          });
        }
      }
    }
    function trigger(target, type, key, newValue, oldValue, oldTarget) {
      const depsMap = targetMap.get(target);
      if (!depsMap) {
        return;
      }
      const effects = /* @__PURE__ */ new Set();
      const add2 = (effectsToAdd) => {
        if (effectsToAdd) {
          effectsToAdd.forEach((effect3) => {
            if (effect3 !== activeEffect || effect3.allowRecurse) {
              effects.add(effect3);
            }
          });
        }
      };
      if (type === "clear") {
        depsMap.forEach(add2);
      } else if (key === "length" && isArray(target)) {
        depsMap.forEach((dep, key2) => {
          if (key2 === "length" || key2 >= newValue) {
            add2(dep);
          }
        });
      } else {
        if (key !== undefined) {
          add2(depsMap.get(key));
        }
        switch (type) {
          case "add":
            if (!isArray(target)) {
              add2(depsMap.get(ITERATE_KEY));
              if (isMap(target)) {
                add2(depsMap.get(MAP_KEY_ITERATE_KEY));
              }
            } else if (isIntegerKey(key)) {
              add2(depsMap.get("length"));
            }
            break;
          case "delete":
            if (!isArray(target)) {
              add2(depsMap.get(ITERATE_KEY));
              if (isMap(target)) {
                add2(depsMap.get(MAP_KEY_ITERATE_KEY));
              }
            }
            break;
          case "set":
            if (isMap(target)) {
              add2(depsMap.get(ITERATE_KEY));
            }
            break;
        }
      }
      const run = (effect3) => {
        if (effect3.options.onTrigger) {
          effect3.options.onTrigger({
            effect: effect3,
            target,
            key,
            type,
            newValue,
            oldValue,
            oldTarget
          });
        }
        if (effect3.options.scheduler) {
          effect3.options.scheduler(effect3);
        } else {
          effect3();
        }
      };
      effects.forEach(run);
    }
    var isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
    var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map((key) => Symbol[key]).filter(isSymbol));
    var get2 = /* @__PURE__ */ createGetter();
    var readonlyGet = /* @__PURE__ */ createGetter(true);
    var arrayInstrumentations = /* @__PURE__ */ createArrayInstrumentations();
    function createArrayInstrumentations() {
      const instrumentations = {};
      ["includes", "indexOf", "lastIndexOf"].forEach((key) => {
        instrumentations[key] = function(...args) {
          const arr = toRaw(this);
          for (let i = 0, l = this.length; i < l; i++) {
            track(arr, "get", i + "");
          }
          const res = arr[key](...args);
          if (res === -1 || res === false) {
            return arr[key](...args.map(toRaw));
          } else {
            return res;
          }
        };
      });
      ["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
        instrumentations[key] = function(...args) {
          pauseTracking();
          const res = toRaw(this)[key].apply(this, args);
          resetTracking();
          return res;
        };
      });
      return instrumentations;
    }
    function createGetter(isReadonly = false, shallow = false) {
      return function get3(target, key, receiver) {
        if (key === "__v_isReactive") {
          return !isReadonly;
        } else if (key === "__v_isReadonly") {
          return isReadonly;
        } else if (key === "__v_raw" && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
          return target;
        }
        const targetIsArray = isArray(target);
        if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
          return Reflect.get(arrayInstrumentations, key, receiver);
        }
        const res = Reflect.get(target, key, receiver);
        if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
          return res;
        }
        if (!isReadonly) {
          track(target, "get", key);
        }
        if (shallow) {
          return res;
        }
        if (isRef(res)) {
          const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
          return shouldUnwrap ? res.value : res;
        }
        if (isObject(res)) {
          return isReadonly ? readonly(res) : reactive2(res);
        }
        return res;
      };
    }
    var set2 = /* @__PURE__ */ createSetter();
    function createSetter(shallow = false) {
      return function set3(target, key, value, receiver) {
        let oldValue = target[key];
        if (!shallow) {
          value = toRaw(value);
          oldValue = toRaw(oldValue);
          if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
            oldValue.value = value;
            return true;
          }
        }
        const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
        const result = Reflect.set(target, key, value, receiver);
        if (target === toRaw(receiver)) {
          if (!hadKey) {
            trigger(target, "add", key, value);
          } else if (hasChanged(value, oldValue)) {
            trigger(target, "set", key, value, oldValue);
          }
        }
        return result;
      };
    }
    function deleteProperty(target, key) {
      const hadKey = hasOwn(target, key);
      const oldValue = target[key];
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
        trigger(target, "delete", key, undefined, oldValue);
      }
      return result;
    }
    function has(target, key) {
      const result = Reflect.has(target, key);
      if (!isSymbol(key) || !builtInSymbols.has(key)) {
        track(target, "has", key);
      }
      return result;
    }
    function ownKeys(target) {
      track(target, "iterate", isArray(target) ? "length" : ITERATE_KEY);
      return Reflect.ownKeys(target);
    }
    var mutableHandlers = {
      get: get2,
      set: set2,
      deleteProperty,
      has,
      ownKeys
    };
    var readonlyHandlers = {
      get: readonlyGet,
      set(target, key) {
        {
          console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
        }
        return true;
      },
      deleteProperty(target, key) {
        {
          console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
        }
        return true;
      }
    };
    var toReactive = (value) => isObject(value) ? reactive2(value) : value;
    var toReadonly = (value) => isObject(value) ? readonly(value) : value;
    var toShallow = (value) => value;
    var getProto = (v) => Reflect.getPrototypeOf(v);
    function get$1(target, key, isReadonly = false, isShallow = false) {
      target = target[
        "__v_raw"
        /* RAW */
      ];
      const rawTarget = toRaw(target);
      const rawKey = toRaw(key);
      if (key !== rawKey) {
        !isReadonly && track(rawTarget, "get", key);
      }
      !isReadonly && track(rawTarget, "get", rawKey);
      const { has: has2 } = getProto(rawTarget);
      const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      if (has2.call(rawTarget, key)) {
        return wrap(target.get(key));
      } else if (has2.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey));
      } else if (target !== rawTarget) {
        target.get(key);
      }
    }
    function has$1(key, isReadonly = false) {
      const target = this[
        "__v_raw"
        /* RAW */
      ];
      const rawTarget = toRaw(target);
      const rawKey = toRaw(key);
      if (key !== rawKey) {
        !isReadonly && track(rawTarget, "has", key);
      }
      !isReadonly && track(rawTarget, "has", rawKey);
      return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
    }
    function size(target, isReadonly = false) {
      target = target[
        "__v_raw"
        /* RAW */
      ];
      !isReadonly && track(toRaw(target), "iterate", ITERATE_KEY);
      return Reflect.get(target, "size", target);
    }
    function add(value) {
      value = toRaw(value);
      const target = toRaw(this);
      const proto = getProto(target);
      const hadKey = proto.has.call(target, value);
      if (!hadKey) {
        target.add(value);
        trigger(target, "add", value, value);
      }
      return this;
    }
    function set$1(key, value) {
      value = toRaw(value);
      const target = toRaw(this);
      const { has: has2, get: get3 } = getProto(target);
      let hadKey = has2.call(target, key);
      if (!hadKey) {
        key = toRaw(key);
        hadKey = has2.call(target, key);
      } else {
        checkIdentityKeys(target, has2, key);
      }
      const oldValue = get3.call(target, key);
      target.set(key, value);
      if (!hadKey) {
        trigger(target, "add", key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, "set", key, value, oldValue);
      }
      return this;
    }
    function deleteEntry(key) {
      const target = toRaw(this);
      const { has: has2, get: get3 } = getProto(target);
      let hadKey = has2.call(target, key);
      if (!hadKey) {
        key = toRaw(key);
        hadKey = has2.call(target, key);
      } else {
        checkIdentityKeys(target, has2, key);
      }
      const oldValue = get3 ? get3.call(target, key) : undefined;
      const result = target.delete(key);
      if (hadKey) {
        trigger(target, "delete", key, undefined, oldValue);
      }
      return result;
    }
    function clear() {
      const target = toRaw(this);
      const hadItems = target.size !== 0;
      const oldTarget = isMap(target) ? new Map(target) : new Set(target) ;
      const result = target.clear();
      if (hadItems) {
        trigger(target, "clear", undefined, undefined, oldTarget);
      }
      return result;
    }
    function createForEach(isReadonly, isShallow) {
      return function forEach(callback, thisArg) {
        const observed = this;
        const target = observed[
          "__v_raw"
          /* RAW */
        ];
        const rawTarget = toRaw(target);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        !isReadonly && track(rawTarget, "iterate", ITERATE_KEY);
        return target.forEach((value, key) => {
          return callback.call(thisArg, wrap(value), wrap(key), observed);
        });
      };
    }
    function createIterableMethod(method, isReadonly, isShallow) {
      return function(...args) {
        const target = this[
          "__v_raw"
          /* RAW */
        ];
        const rawTarget = toRaw(target);
        const targetIsMap = isMap(rawTarget);
        const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
        const isKeyOnly = method === "keys" && targetIsMap;
        const innerIterator = target[method](...args);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        !isReadonly && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
        return {
          // iterator protocol
          next() {
            const { value, done } = innerIterator.next();
            return done ? { value, done } : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            };
          },
          // iterable protocol
          [Symbol.iterator]() {
            return this;
          }
        };
      };
    }
    function createReadonlyMethod(type) {
      return function(...args) {
        {
          const key = args[0] ? `on key "${args[0]}" ` : ``;
          console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
        }
        return type === "delete" ? false : this;
      };
    }
    function createInstrumentations() {
      const mutableInstrumentations2 = {
        get(key) {
          return get$1(this, key);
        },
        get size() {
          return size(this);
        },
        has: has$1,
        add,
        set: set$1,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
      };
      const shallowInstrumentations2 = {
        get(key) {
          return get$1(this, key, false, true);
        },
        get size() {
          return size(this);
        },
        has: has$1,
        add,
        set: set$1,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, true)
      };
      const readonlyInstrumentations2 = {
        get(key) {
          return get$1(this, key, true);
        },
        get size() {
          return size(this, true);
        },
        has(key) {
          return has$1.call(this, key, true);
        },
        add: createReadonlyMethod(
          "add"
          /* ADD */
        ),
        set: createReadonlyMethod(
          "set"
          /* SET */
        ),
        delete: createReadonlyMethod(
          "delete"
          /* DELETE */
        ),
        clear: createReadonlyMethod(
          "clear"
          /* CLEAR */
        ),
        forEach: createForEach(true, false)
      };
      const shallowReadonlyInstrumentations2 = {
        get(key) {
          return get$1(this, key, true, true);
        },
        get size() {
          return size(this, true);
        },
        has(key) {
          return has$1.call(this, key, true);
        },
        add: createReadonlyMethod(
          "add"
          /* ADD */
        ),
        set: createReadonlyMethod(
          "set"
          /* SET */
        ),
        delete: createReadonlyMethod(
          "delete"
          /* DELETE */
        ),
        clear: createReadonlyMethod(
          "clear"
          /* CLEAR */
        ),
        forEach: createForEach(true, true)
      };
      const iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
      iteratorMethods.forEach((method) => {
        mutableInstrumentations2[method] = createIterableMethod(method, false, false);
        readonlyInstrumentations2[method] = createIterableMethod(method, true, false);
        shallowInstrumentations2[method] = createIterableMethod(method, false, true);
        shallowReadonlyInstrumentations2[method] = createIterableMethod(method, true, true);
      });
      return [
        mutableInstrumentations2,
        readonlyInstrumentations2,
        shallowInstrumentations2,
        shallowReadonlyInstrumentations2
      ];
    }
    var [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations] = /* @__PURE__ */ createInstrumentations();
    function createInstrumentationGetter(isReadonly, shallow) {
      const instrumentations = isReadonly ? readonlyInstrumentations : mutableInstrumentations;
      return (target, key, receiver) => {
        if (key === "__v_isReactive") {
          return !isReadonly;
        } else if (key === "__v_isReadonly") {
          return isReadonly;
        } else if (key === "__v_raw") {
          return target;
        }
        return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
      };
    }
    var mutableCollectionHandlers = {
      get: /* @__PURE__ */ createInstrumentationGetter(false)
    };
    var readonlyCollectionHandlers = {
      get: /* @__PURE__ */ createInstrumentationGetter(true)
    };
    function checkIdentityKeys(target, has2, key) {
      const rawKey = toRaw(key);
      if (rawKey !== key && has2.call(target, rawKey)) {
        const type = toRawType(target);
        console.warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
      }
    }
    var reactiveMap = /* @__PURE__ */ new WeakMap();
    var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
    var readonlyMap = /* @__PURE__ */ new WeakMap();
    var shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
    function targetTypeMap(rawType) {
      switch (rawType) {
        case "Object":
        case "Array":
          return 1;
        case "Map":
        case "Set":
        case "WeakMap":
        case "WeakSet":
          return 2;
        default:
          return 0;
      }
    }
    function getTargetType(value) {
      return value[
        "__v_skip"
        /* SKIP */
      ] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
    }
    function reactive2(target) {
      if (target && target[
        "__v_isReadonly"
        /* IS_READONLY */
      ]) {
        return target;
      }
      return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
    }
    function readonly(target) {
      return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
    }
    function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
      if (!isObject(target)) {
        {
          console.warn(`value cannot be made reactive: ${String(target)}`);
        }
        return target;
      }
      if (target[
        "__v_raw"
        /* RAW */
      ] && !(isReadonly && target[
        "__v_isReactive"
        /* IS_REACTIVE */
      ])) {
        return target;
      }
      const existingProxy = proxyMap.get(target);
      if (existingProxy) {
        return existingProxy;
      }
      const targetType = getTargetType(target);
      if (targetType === 0) {
        return target;
      }
      const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
      proxyMap.set(target, proxy);
      return proxy;
    }
    function toRaw(observed) {
      return observed && toRaw(observed[
        "__v_raw"
        /* RAW */
      ]) || observed;
    }
    function isRef(r) {
      return Boolean(r && r.__v_isRef === true);
    }

    // packages/alpinejs/src/magics/$nextTick.js
    magic("nextTick", () => nextTick);

    // packages/alpinejs/src/magics/$dispatch.js
    magic("dispatch", (el) => dispatch.bind(dispatch, el));

    // packages/alpinejs/src/magics/$watch.js
    magic("watch", (el, { evaluateLater: evaluateLater2, cleanup: cleanup2 }) => (key, callback) => {
      let evaluate2 = evaluateLater2(key);
      let getter = () => {
        let value;
        evaluate2((i) => value = i);
        return value;
      };
      let unwatch = watch(getter, callback);
      cleanup2(unwatch);
    });

    // packages/alpinejs/src/magics/$store.js
    magic("store", getStores);

    // packages/alpinejs/src/magics/$data.js
    magic("data", (el) => scope(el));

    // packages/alpinejs/src/magics/$root.js
    magic("root", (el) => closestRoot(el));

    // packages/alpinejs/src/magics/$refs.js
    magic("refs", (el) => {
      if (el._x_refs_proxy)
        return el._x_refs_proxy;
      el._x_refs_proxy = mergeProxies(getArrayOfRefObject(el));
      return el._x_refs_proxy;
    });
    function getArrayOfRefObject(el) {
      let refObjects = [];
      findClosest(el, (i) => {
        if (i._x_refs)
          refObjects.push(i._x_refs);
      });
      return refObjects;
    }

    // packages/alpinejs/src/ids.js
    var globalIdMemo = {};
    function findAndIncrementId(name) {
      if (!globalIdMemo[name])
        globalIdMemo[name] = 0;
      return ++globalIdMemo[name];
    }
    function closestIdRoot(el, name) {
      return findClosest(el, (element) => {
        if (element._x_ids && element._x_ids[name])
          return true;
      });
    }
    function setIdRoot(el, name) {
      if (!el._x_ids)
        el._x_ids = {};
      if (!el._x_ids[name])
        el._x_ids[name] = findAndIncrementId(name);
    }

    // packages/alpinejs/src/magics/$id.js
    magic("id", (el, { cleanup: cleanup2 }) => (name, key = null) => {
      let cacheKey = `${name}${key ? `-${key}` : ""}`;
      return cacheIdByNameOnElement(el, cacheKey, cleanup2, () => {
        let root = closestIdRoot(el, name);
        let id = root ? root._x_ids[name] : findAndIncrementId(name);
        return key ? `${name}-${id}-${key}` : `${name}-${id}`;
      });
    });
    interceptClone((from, to) => {
      if (from._x_id) {
        to._x_id = from._x_id;
      }
    });
    function cacheIdByNameOnElement(el, cacheKey, cleanup2, callback) {
      if (!el._x_id)
        el._x_id = {};
      if (el._x_id[cacheKey])
        return el._x_id[cacheKey];
      let output = callback();
      el._x_id[cacheKey] = output;
      cleanup2(() => {
        delete el._x_id[cacheKey];
      });
      return output;
    }

    // packages/alpinejs/src/magics/$el.js
    magic("el", (el) => el);

    // packages/alpinejs/src/magics/index.js
    warnMissingPluginMagic("Focus", "focus", "focus");
    warnMissingPluginMagic("Persist", "persist", "persist");
    function warnMissingPluginMagic(name, magicName, slug) {
      magic(magicName, (el) => warn(`You can't use [$${magicName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
    }

    // packages/alpinejs/src/directives/x-modelable.js
    directive("modelable", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2, cleanup: cleanup2 }) => {
      let func = evaluateLater2(expression);
      let innerGet = () => {
        let result;
        func((i) => result = i);
        return result;
      };
      let evaluateInnerSet = evaluateLater2(`${expression} = __placeholder`);
      let innerSet = (val) => evaluateInnerSet(() => {
      }, { scope: { "__placeholder": val } });
      let initialValue = innerGet();
      innerSet(initialValue);
      queueMicrotask(() => {
        if (!el._x_model)
          return;
        el._x_removeModelListeners["default"]();
        let outerGet = el._x_model.get;
        let outerSet = el._x_model.set;
        let releaseEntanglement = entangle(
          {
            get() {
              return outerGet();
            },
            set(value) {
              outerSet(value);
            }
          },
          {
            get() {
              return innerGet();
            },
            set(value) {
              innerSet(value);
            }
          }
        );
        cleanup2(releaseEntanglement);
      });
    });

    // packages/alpinejs/src/directives/x-teleport.js
    directive("teleport", (el, { modifiers, expression }, { cleanup: cleanup2 }) => {
      if (el.tagName.toLowerCase() !== "template")
        warn("x-teleport can only be used on a <template> tag", el);
      let target = getTarget(expression);
      let clone2 = el.content.cloneNode(true).firstElementChild;
      el._x_teleport = clone2;
      clone2._x_teleportBack = el;
      el.setAttribute("data-teleport-template", true);
      clone2.setAttribute("data-teleport-target", true);
      if (el._x_forwardEvents) {
        el._x_forwardEvents.forEach((eventName) => {
          clone2.addEventListener(eventName, (e) => {
            e.stopPropagation();
            el.dispatchEvent(new e.constructor(e.type, e));
          });
        });
      }
      addScopeToNode(clone2, {}, el);
      let placeInDom = (clone3, target2, modifiers2) => {
        if (modifiers2.includes("prepend")) {
          target2.parentNode.insertBefore(clone3, target2);
        } else if (modifiers2.includes("append")) {
          target2.parentNode.insertBefore(clone3, target2.nextSibling);
        } else {
          target2.appendChild(clone3);
        }
      };
      mutateDom(() => {
        placeInDom(clone2, target, modifiers);
        skipDuringClone(() => {
          initTree(clone2);
        })();
      });
      el._x_teleportPutBack = () => {
        let target2 = getTarget(expression);
        mutateDom(() => {
          placeInDom(el._x_teleport, target2, modifiers);
        });
      };
      cleanup2(
        () => mutateDom(() => {
          clone2.remove();
          destroyTree(clone2);
        })
      );
    });
    var teleportContainerDuringClone = document.createElement("div");
    function getTarget(expression) {
      let target = skipDuringClone(() => {
        return document.querySelector(expression);
      }, () => {
        return teleportContainerDuringClone;
      })();
      if (!target)
        warn(`Cannot find x-teleport element for selector: "${expression}"`);
      return target;
    }

    // packages/alpinejs/src/directives/x-ignore.js
    var handler = () => {
    };
    handler.inline = (el, { modifiers }, { cleanup: cleanup2 }) => {
      modifiers.includes("self") ? el._x_ignoreSelf = true : el._x_ignore = true;
      cleanup2(() => {
        modifiers.includes("self") ? delete el._x_ignoreSelf : delete el._x_ignore;
      });
    };
    directive("ignore", handler);

    // packages/alpinejs/src/directives/x-effect.js
    directive("effect", skipDuringClone((el, { expression }, { effect: effect3 }) => {
      effect3(evaluateLater(el, expression));
    }));

    // packages/alpinejs/src/utils/on.js
    function on(el, event, modifiers, callback) {
      let listenerTarget = el;
      let handler4 = (e) => callback(e);
      let options = {};
      let wrapHandler = (callback2, wrapper) => (e) => wrapper(callback2, e);
      if (modifiers.includes("dot"))
        event = dotSyntax(event);
      if (modifiers.includes("camel"))
        event = camelCase2(event);
      if (modifiers.includes("passive"))
        options.passive = true;
      if (modifiers.includes("capture"))
        options.capture = true;
      if (modifiers.includes("window"))
        listenerTarget = window;
      if (modifiers.includes("document"))
        listenerTarget = document;
      if (modifiers.includes("debounce")) {
        let nextModifier = modifiers[modifiers.indexOf("debounce") + 1] || "invalid-wait";
        let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
        handler4 = debounce(handler4, wait);
      }
      if (modifiers.includes("throttle")) {
        let nextModifier = modifiers[modifiers.indexOf("throttle") + 1] || "invalid-wait";
        let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
        handler4 = throttle(handler4, wait);
      }
      if (modifiers.includes("prevent"))
        handler4 = wrapHandler(handler4, (next, e) => {
          e.preventDefault();
          next(e);
        });
      if (modifiers.includes("stop"))
        handler4 = wrapHandler(handler4, (next, e) => {
          e.stopPropagation();
          next(e);
        });
      if (modifiers.includes("once")) {
        handler4 = wrapHandler(handler4, (next, e) => {
          next(e);
          listenerTarget.removeEventListener(event, handler4, options);
        });
      }
      if (modifiers.includes("away") || modifiers.includes("outside")) {
        listenerTarget = document;
        handler4 = wrapHandler(handler4, (next, e) => {
          if (el.contains(e.target))
            return;
          if (e.target.isConnected === false)
            return;
          if (el.offsetWidth < 1 && el.offsetHeight < 1)
            return;
          if (el._x_isShown === false)
            return;
          next(e);
        });
      }
      if (modifiers.includes("self"))
        handler4 = wrapHandler(handler4, (next, e) => {
          e.target === el && next(e);
        });
      if (isKeyEvent(event) || isClickEvent(event)) {
        handler4 = wrapHandler(handler4, (next, e) => {
          if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
            return;
          }
          next(e);
        });
      }
      listenerTarget.addEventListener(event, handler4, options);
      return () => {
        listenerTarget.removeEventListener(event, handler4, options);
      };
    }
    function dotSyntax(subject) {
      return subject.replace(/-/g, ".");
    }
    function camelCase2(subject) {
      return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
    }
    function isNumeric(subject) {
      return !Array.isArray(subject) && !isNaN(subject);
    }
    function kebabCase2(subject) {
      if ([" ", "_"].includes(
        subject
      ))
        return subject;
      return subject.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase();
    }
    function isKeyEvent(event) {
      return ["keydown", "keyup"].includes(event);
    }
    function isClickEvent(event) {
      return ["contextmenu", "click", "mouse"].some((i) => event.includes(i));
    }
    function isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers) {
      let keyModifiers = modifiers.filter((i) => {
        return !["window", "document", "prevent", "stop", "once", "capture", "self", "away", "outside", "passive"].includes(i);
      });
      if (keyModifiers.includes("debounce")) {
        let debounceIndex = keyModifiers.indexOf("debounce");
        keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
      }
      if (keyModifiers.includes("throttle")) {
        let debounceIndex = keyModifiers.indexOf("throttle");
        keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
      }
      if (keyModifiers.length === 0)
        return false;
      if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0]))
        return false;
      const systemKeyModifiers = ["ctrl", "shift", "alt", "meta", "cmd", "super"];
      const selectedSystemKeyModifiers = systemKeyModifiers.filter((modifier) => keyModifiers.includes(modifier));
      keyModifiers = keyModifiers.filter((i) => !selectedSystemKeyModifiers.includes(i));
      if (selectedSystemKeyModifiers.length > 0) {
        const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter((modifier) => {
          if (modifier === "cmd" || modifier === "super")
            modifier = "meta";
          return e[`${modifier}Key`];
        });
        if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {
          if (isClickEvent(e.type))
            return false;
          if (keyToModifiers(e.key).includes(keyModifiers[0]))
            return false;
        }
      }
      return true;
    }
    function keyToModifiers(key) {
      if (!key)
        return [];
      key = kebabCase2(key);
      let modifierToKeyMap = {
        "ctrl": "control",
        "slash": "/",
        "space": " ",
        "spacebar": " ",
        "cmd": "meta",
        "esc": "escape",
        "up": "arrow-up",
        "down": "arrow-down",
        "left": "arrow-left",
        "right": "arrow-right",
        "period": ".",
        "comma": ",",
        "equal": "=",
        "minus": "-",
        "underscore": "_"
      };
      modifierToKeyMap[key] = key;
      return Object.keys(modifierToKeyMap).map((modifier) => {
        if (modifierToKeyMap[modifier] === key)
          return modifier;
      }).filter((modifier) => modifier);
    }

    // packages/alpinejs/src/directives/x-model.js
    directive("model", (el, { modifiers, expression }, { effect: effect3, cleanup: cleanup2 }) => {
      let scopeTarget = el;
      if (modifiers.includes("parent")) {
        scopeTarget = el.parentNode;
      }
      let evaluateGet = evaluateLater(scopeTarget, expression);
      let evaluateSet;
      if (typeof expression === "string") {
        evaluateSet = evaluateLater(scopeTarget, `${expression} = __placeholder`);
      } else if (typeof expression === "function" && typeof expression() === "string") {
        evaluateSet = evaluateLater(scopeTarget, `${expression()} = __placeholder`);
      } else {
        evaluateSet = () => {
        };
      }
      let getValue = () => {
        let result;
        evaluateGet((value) => result = value);
        return isGetterSetter(result) ? result.get() : result;
      };
      let setValue = (value) => {
        let result;
        evaluateGet((value2) => result = value2);
        if (isGetterSetter(result)) {
          result.set(value);
        } else {
          evaluateSet(() => {
          }, {
            scope: { "__placeholder": value }
          });
        }
      };
      if (typeof expression === "string" && el.type === "radio") {
        mutateDom(() => {
          if (!el.hasAttribute("name"))
            el.setAttribute("name", expression);
        });
      }
      var event = el.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(el.type) || modifiers.includes("lazy") ? "change" : "input";
      let removeListener = isCloning ? () => {
      } : on(el, event, modifiers, (e) => {
        setValue(getInputValue(el, modifiers, e, getValue()));
      });
      if (modifiers.includes("fill")) {
        if ([undefined, null, ""].includes(getValue()) || isCheckbox(el) && Array.isArray(getValue()) || el.tagName.toLowerCase() === "select" && el.multiple) {
          setValue(
            getInputValue(el, modifiers, { target: el }, getValue())
          );
        }
      }
      if (!el._x_removeModelListeners)
        el._x_removeModelListeners = {};
      el._x_removeModelListeners["default"] = removeListener;
      cleanup2(() => el._x_removeModelListeners["default"]());
      if (el.form) {
        let removeResetListener = on(el.form, "reset", [], (e) => {
          nextTick(() => el._x_model && el._x_model.set(getInputValue(el, modifiers, { target: el }, getValue())));
        });
        cleanup2(() => removeResetListener());
      }
      el._x_model = {
        get() {
          return getValue();
        },
        set(value) {
          setValue(value);
        }
      };
      el._x_forceModelUpdate = (value) => {
        if (value === undefined && typeof expression === "string" && expression.match(/\./))
          value = "";
        window.fromModel = true;
        mutateDom(() => bind(el, "value", value));
        delete window.fromModel;
      };
      effect3(() => {
        let value = getValue();
        if (modifiers.includes("unintrusive") && document.activeElement.isSameNode(el))
          return;
        el._x_forceModelUpdate(value);
      });
    });
    function getInputValue(el, modifiers, event, currentValue) {
      return mutateDom(() => {
        if (event instanceof CustomEvent && event.detail !== undefined)
          return event.detail !== null && event.detail !== undefined ? event.detail : event.target.value;
        else if (isCheckbox(el)) {
          if (Array.isArray(currentValue)) {
            let newValue = null;
            if (modifiers.includes("number")) {
              newValue = safeParseNumber(event.target.value);
            } else if (modifiers.includes("boolean")) {
              newValue = safeParseBoolean(event.target.value);
            } else {
              newValue = event.target.value;
            }
            return event.target.checked ? currentValue.includes(newValue) ? currentValue : currentValue.concat([newValue]) : currentValue.filter((el2) => !checkedAttrLooseCompare2(el2, newValue));
          } else {
            return event.target.checked;
          }
        } else if (el.tagName.toLowerCase() === "select" && el.multiple) {
          if (modifiers.includes("number")) {
            return Array.from(event.target.selectedOptions).map((option) => {
              let rawValue = option.value || option.text;
              return safeParseNumber(rawValue);
            });
          } else if (modifiers.includes("boolean")) {
            return Array.from(event.target.selectedOptions).map((option) => {
              let rawValue = option.value || option.text;
              return safeParseBoolean(rawValue);
            });
          }
          return Array.from(event.target.selectedOptions).map((option) => {
            return option.value || option.text;
          });
        } else {
          let newValue;
          if (isRadio(el)) {
            if (event.target.checked) {
              newValue = event.target.value;
            } else {
              newValue = currentValue;
            }
          } else {
            newValue = event.target.value;
          }
          if (modifiers.includes("number")) {
            return safeParseNumber(newValue);
          } else if (modifiers.includes("boolean")) {
            return safeParseBoolean(newValue);
          } else if (modifiers.includes("trim")) {
            return newValue.trim();
          } else {
            return newValue;
          }
        }
      });
    }
    function safeParseNumber(rawValue) {
      let number = rawValue ? parseFloat(rawValue) : null;
      return isNumeric2(number) ? number : rawValue;
    }
    function checkedAttrLooseCompare2(valueA, valueB) {
      return valueA == valueB;
    }
    function isNumeric2(subject) {
      return !Array.isArray(subject) && !isNaN(subject);
    }
    function isGetterSetter(value) {
      return value !== null && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function";
    }

    // packages/alpinejs/src/directives/x-cloak.js
    directive("cloak", (el) => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix("cloak")))));

    // packages/alpinejs/src/directives/x-init.js
    addInitSelector(() => `[${prefix("init")}]`);
    directive("init", skipDuringClone((el, { expression }, { evaluate: evaluate2 }) => {
      if (typeof expression === "string") {
        return !!expression.trim() && evaluate2(expression, {}, false);
      }
      return evaluate2(expression, {}, false);
    }));

    // packages/alpinejs/src/directives/x-text.js
    directive("text", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2 }) => {
      let evaluate2 = evaluateLater2(expression);
      effect3(() => {
        evaluate2((value) => {
          mutateDom(() => {
            el.textContent = value;
          });
        });
      });
    });

    // packages/alpinejs/src/directives/x-html.js
    directive("html", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2 }) => {
      let evaluate2 = evaluateLater2(expression);
      effect3(() => {
        evaluate2((value) => {
          mutateDom(() => {
            el.innerHTML = value;
            el._x_ignoreSelf = true;
            initTree(el);
            delete el._x_ignoreSelf;
          });
        });
      });
    });

    // packages/alpinejs/src/directives/x-bind.js
    mapAttributes(startingWith(":", into(prefix("bind:"))));
    var handler2 = (el, { value, modifiers, expression, original }, { effect: effect3, cleanup: cleanup2 }) => {
      if (!value) {
        let bindingProviders = {};
        injectBindingProviders(bindingProviders);
        let getBindings = evaluateLater(el, expression);
        getBindings((bindings) => {
          applyBindingsObject(el, bindings, original);
        }, { scope: bindingProviders });
        return;
      }
      if (value === "key")
        return storeKeyForXFor(el, expression);
      if (el._x_inlineBindings && el._x_inlineBindings[value] && el._x_inlineBindings[value].extract) {
        return;
      }
      let evaluate2 = evaluateLater(el, expression);
      effect3(() => evaluate2((result) => {
        if (result === undefined && typeof expression === "string" && expression.match(/\./)) {
          result = "";
        }
        mutateDom(() => bind(el, value, result, modifiers));
      }));
      cleanup2(() => {
        el._x_undoAddedClasses && el._x_undoAddedClasses();
        el._x_undoAddedStyles && el._x_undoAddedStyles();
      });
    };
    handler2.inline = (el, { value, modifiers, expression }) => {
      if (!value)
        return;
      if (!el._x_inlineBindings)
        el._x_inlineBindings = {};
      el._x_inlineBindings[value] = { expression, extract: false };
    };
    directive("bind", handler2);
    function storeKeyForXFor(el, expression) {
      el._x_keyExpression = expression;
    }

    // packages/alpinejs/src/directives/x-data.js
    addRootSelector(() => `[${prefix("data")}]`);
    directive("data", (el, { expression }, { cleanup: cleanup2 }) => {
      if (shouldSkipRegisteringDataDuringClone(el))
        return;
      expression = expression === "" ? "{}" : expression;
      let magicContext = {};
      injectMagics(magicContext, el);
      let dataProviderContext = {};
      injectDataProviders(dataProviderContext, magicContext);
      let data2 = evaluate(el, expression, { scope: dataProviderContext });
      if (data2 === undefined || data2 === true)
        data2 = {};
      injectMagics(data2, el);
      let reactiveData = reactive(data2);
      initInterceptors(reactiveData);
      let undo = addScopeToNode(el, reactiveData);
      reactiveData["init"] && evaluate(el, reactiveData["init"]);
      cleanup2(() => {
        reactiveData["destroy"] && evaluate(el, reactiveData["destroy"]);
        undo();
      });
    });
    interceptClone((from, to) => {
      if (from._x_dataStack) {
        to._x_dataStack = from._x_dataStack;
        to.setAttribute("data-has-alpine-state", true);
      }
    });
    function shouldSkipRegisteringDataDuringClone(el) {
      if (!isCloning)
        return false;
      if (isCloningLegacy)
        return true;
      return el.hasAttribute("data-has-alpine-state");
    }

    // packages/alpinejs/src/directives/x-show.js
    directive("show", (el, { modifiers, expression }, { effect: effect3 }) => {
      let evaluate2 = evaluateLater(el, expression);
      if (!el._x_doHide)
        el._x_doHide = () => {
          mutateDom(() => {
            el.style.setProperty("display", "none", modifiers.includes("important") ? "important" : undefined);
          });
        };
      if (!el._x_doShow)
        el._x_doShow = () => {
          mutateDom(() => {
            if (el.style.length === 1 && el.style.display === "none") {
              el.removeAttribute("style");
            } else {
              el.style.removeProperty("display");
            }
          });
        };
      let hide = () => {
        el._x_doHide();
        el._x_isShown = false;
      };
      let show = () => {
        el._x_doShow();
        el._x_isShown = true;
      };
      let clickAwayCompatibleShow = () => setTimeout(show);
      let toggle = once(
        (value) => value ? show() : hide(),
        (value) => {
          if (typeof el._x_toggleAndCascadeWithTransitions === "function") {
            el._x_toggleAndCascadeWithTransitions(el, value, show, hide);
          } else {
            value ? clickAwayCompatibleShow() : hide();
          }
        }
      );
      let oldValue;
      let firstTime = true;
      effect3(() => evaluate2((value) => {
        if (!firstTime && value === oldValue)
          return;
        if (modifiers.includes("immediate"))
          value ? clickAwayCompatibleShow() : hide();
        toggle(value);
        oldValue = value;
        firstTime = false;
      }));
    });

    // packages/alpinejs/src/directives/x-for.js
    directive("for", (el, { expression }, { effect: effect3, cleanup: cleanup2 }) => {
      let iteratorNames = parseForExpression(expression);
      let evaluateItems = evaluateLater(el, iteratorNames.items);
      let evaluateKey = evaluateLater(
        el,
        // the x-bind:key expression is stored for our use instead of evaluated.
        el._x_keyExpression || "index"
      );
      el._x_prevKeys = [];
      el._x_lookup = {};
      effect3(() => loop(el, iteratorNames, evaluateItems, evaluateKey));
      cleanup2(() => {
        Object.values(el._x_lookup).forEach((el2) => mutateDom(
          () => {
            destroyTree(el2);
            el2.remove();
          }
        ));
        delete el._x_prevKeys;
        delete el._x_lookup;
      });
    });
    function loop(el, iteratorNames, evaluateItems, evaluateKey) {
      let isObject2 = (i) => typeof i === "object" && !Array.isArray(i);
      let templateEl = el;
      evaluateItems((items) => {
        if (isNumeric3(items) && items >= 0) {
          items = Array.from(Array(items).keys(), (i) => i + 1);
        }
        if (items === undefined)
          items = [];
        let lookup = el._x_lookup;
        let prevKeys = el._x_prevKeys;
        let scopes = [];
        let keys = [];
        if (isObject2(items)) {
          items = Object.entries(items).map(([key, value]) => {
            let scope2 = getIterationScopeVariables(iteratorNames, value, key, items);
            evaluateKey((value2) => {
              if (keys.includes(value2))
                warn("Duplicate key on x-for", el);
              keys.push(value2);
            }, { scope: { index: key, ...scope2 } });
            scopes.push(scope2);
          });
        } else {
          for (let i = 0; i < items.length; i++) {
            let scope2 = getIterationScopeVariables(iteratorNames, items[i], i, items);
            evaluateKey((value) => {
              if (keys.includes(value))
                warn("Duplicate key on x-for", el);
              keys.push(value);
            }, { scope: { index: i, ...scope2 } });
            scopes.push(scope2);
          }
        }
        let adds = [];
        let moves = [];
        let removes = [];
        let sames = [];
        for (let i = 0; i < prevKeys.length; i++) {
          let key = prevKeys[i];
          if (keys.indexOf(key) === -1)
            removes.push(key);
        }
        prevKeys = prevKeys.filter((key) => !removes.includes(key));
        let lastKey = "template";
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          let prevIndex = prevKeys.indexOf(key);
          if (prevIndex === -1) {
            prevKeys.splice(i, 0, key);
            adds.push([lastKey, i]);
          } else if (prevIndex !== i) {
            let keyInSpot = prevKeys.splice(i, 1)[0];
            let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0];
            prevKeys.splice(i, 0, keyForSpot);
            prevKeys.splice(prevIndex, 0, keyInSpot);
            moves.push([keyInSpot, keyForSpot]);
          } else {
            sames.push(key);
          }
          lastKey = key;
        }
        for (let i = 0; i < removes.length; i++) {
          let key = removes[i];
          if (!(key in lookup))
            continue;
          mutateDom(() => {
            destroyTree(lookup[key]);
            lookup[key].remove();
          });
          delete lookup[key];
        }
        for (let i = 0; i < moves.length; i++) {
          let [keyInSpot, keyForSpot] = moves[i];
          let elInSpot = lookup[keyInSpot];
          let elForSpot = lookup[keyForSpot];
          let marker = document.createElement("div");
          mutateDom(() => {
            if (!elForSpot)
              warn(`x-for ":key" is undefined or invalid`, templateEl, keyForSpot, lookup);
            elForSpot.after(marker);
            elInSpot.after(elForSpot);
            elForSpot._x_currentIfEl && elForSpot.after(elForSpot._x_currentIfEl);
            marker.before(elInSpot);
            elInSpot._x_currentIfEl && elInSpot.after(elInSpot._x_currentIfEl);
            marker.remove();
          });
          elForSpot._x_refreshXForScope(scopes[keys.indexOf(keyForSpot)]);
        }
        for (let i = 0; i < adds.length; i++) {
          let [lastKey2, index] = adds[i];
          let lastEl = lastKey2 === "template" ? templateEl : lookup[lastKey2];
          if (lastEl._x_currentIfEl)
            lastEl = lastEl._x_currentIfEl;
          let scope2 = scopes[index];
          let key = keys[index];
          let clone2 = document.importNode(templateEl.content, true).firstElementChild;
          let reactiveScope = reactive(scope2);
          addScopeToNode(clone2, reactiveScope, templateEl);
          clone2._x_refreshXForScope = (newScope) => {
            Object.entries(newScope).forEach(([key2, value]) => {
              reactiveScope[key2] = value;
            });
          };
          mutateDom(() => {
            lastEl.after(clone2);
            skipDuringClone(() => initTree(clone2))();
          });
          if (typeof key === "object") {
            warn("x-for key cannot be an object, it must be a string or an integer", templateEl);
          }
          lookup[key] = clone2;
        }
        for (let i = 0; i < sames.length; i++) {
          lookup[sames[i]]._x_refreshXForScope(scopes[keys.indexOf(sames[i])]);
        }
        templateEl._x_prevKeys = keys;
      });
    }
    function parseForExpression(expression) {
      let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
      let stripParensRE = /^\s*\(|\)\s*$/g;
      let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
      let inMatch = expression.match(forAliasRE);
      if (!inMatch)
        return;
      let res = {};
      res.items = inMatch[2].trim();
      let item = inMatch[1].replace(stripParensRE, "").trim();
      let iteratorMatch = item.match(forIteratorRE);
      if (iteratorMatch) {
        res.item = item.replace(forIteratorRE, "").trim();
        res.index = iteratorMatch[1].trim();
        if (iteratorMatch[2]) {
          res.collection = iteratorMatch[2].trim();
        }
      } else {
        res.item = item;
      }
      return res;
    }
    function getIterationScopeVariables(iteratorNames, item, index, items) {
      let scopeVariables = {};
      if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
        let names = iteratorNames.item.replace("[", "").replace("]", "").split(",").map((i) => i.trim());
        names.forEach((name, i) => {
          scopeVariables[name] = item[i];
        });
      } else if (/^\{.*\}$/.test(iteratorNames.item) && !Array.isArray(item) && typeof item === "object") {
        let names = iteratorNames.item.replace("{", "").replace("}", "").split(",").map((i) => i.trim());
        names.forEach((name) => {
          scopeVariables[name] = item[name];
        });
      } else {
        scopeVariables[iteratorNames.item] = item;
      }
      if (iteratorNames.index)
        scopeVariables[iteratorNames.index] = index;
      if (iteratorNames.collection)
        scopeVariables[iteratorNames.collection] = items;
      return scopeVariables;
    }
    function isNumeric3(subject) {
      return !Array.isArray(subject) && !isNaN(subject);
    }

    // packages/alpinejs/src/directives/x-ref.js
    function handler3() {
    }
    handler3.inline = (el, { expression }, { cleanup: cleanup2 }) => {
      let root = closestRoot(el);
      if (!root._x_refs)
        root._x_refs = {};
      root._x_refs[expression] = el;
      cleanup2(() => delete root._x_refs[expression]);
    };
    directive("ref", handler3);

    // packages/alpinejs/src/directives/x-if.js
    directive("if", (el, { expression }, { effect: effect3, cleanup: cleanup2 }) => {
      if (el.tagName.toLowerCase() !== "template")
        warn("x-if can only be used on a <template> tag", el);
      let evaluate2 = evaluateLater(el, expression);
      let show = () => {
        if (el._x_currentIfEl)
          return el._x_currentIfEl;
        let clone2 = el.content.cloneNode(true).firstElementChild;
        addScopeToNode(clone2, {}, el);
        mutateDom(() => {
          el.after(clone2);
          skipDuringClone(() => initTree(clone2))();
        });
        el._x_currentIfEl = clone2;
        el._x_undoIf = () => {
          mutateDom(() => {
            destroyTree(clone2);
            clone2.remove();
          });
          delete el._x_currentIfEl;
        };
        return clone2;
      };
      let hide = () => {
        if (!el._x_undoIf)
          return;
        el._x_undoIf();
        delete el._x_undoIf;
      };
      effect3(() => evaluate2((value) => {
        value ? show() : hide();
      }));
      cleanup2(() => el._x_undoIf && el._x_undoIf());
    });

    // packages/alpinejs/src/directives/x-id.js
    directive("id", (el, { expression }, { evaluate: evaluate2 }) => {
      let names = evaluate2(expression);
      names.forEach((name) => setIdRoot(el, name));
    });
    interceptClone((from, to) => {
      if (from._x_ids) {
        to._x_ids = from._x_ids;
      }
    });

    // packages/alpinejs/src/directives/x-on.js
    mapAttributes(startingWith("@", into(prefix("on:"))));
    directive("on", skipDuringClone((el, { value, modifiers, expression }, { cleanup: cleanup2 }) => {
      let evaluate2 = expression ? evaluateLater(el, expression) : () => {
      };
      if (el.tagName.toLowerCase() === "template") {
        if (!el._x_forwardEvents)
          el._x_forwardEvents = [];
        if (!el._x_forwardEvents.includes(value))
          el._x_forwardEvents.push(value);
      }
      let removeListener = on(el, value, modifiers, (e) => {
        evaluate2(() => {
        }, { scope: { "$event": e }, params: [e] });
      });
      cleanup2(() => removeListener());
    }));

    // packages/alpinejs/src/directives/index.js
    warnMissingPluginDirective("Collapse", "collapse", "collapse");
    warnMissingPluginDirective("Intersect", "intersect", "intersect");
    warnMissingPluginDirective("Focus", "trap", "focus");
    warnMissingPluginDirective("Mask", "mask", "mask");
    function warnMissingPluginDirective(name, directiveName, slug) {
      directive(directiveName, (el) => warn(`You can't use [x-${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
    }

    // packages/alpinejs/src/index.js
    alpine_default.setEvaluator(normalEvaluator);
    alpine_default.setReactivityEngine({ reactive: reactive2, effect: effect2, release: stop, raw: toRaw });
    var src_default = alpine_default;

    // packages/alpinejs/builds/module.js
    var module_default = src_default;

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function commonjsRequire(path) {
    	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
    }

    var moment$2 = {exports: {}};

    var moment$1 = moment$2.exports;

    var hasRequiredMoment;

    function requireMoment () {
    	if (hasRequiredMoment) return moment$2.exports;
    	hasRequiredMoment = 1;
    	(function (module, exports) {
    (function (global, factory) {
    		    module.exports = factory() ;
    		}(moment$1, (function () {
    		    var hookCallback;

    		    function hooks() {
    		        return hookCallback.apply(null, arguments);
    		    }

    		    // This is done to register the method called with moment()
    		    // without creating circular dependencies.
    		    function setHookCallback(callback) {
    		        hookCallback = callback;
    		    }

    		    function isArray(input) {
    		        return (
    		            input instanceof Array ||
    		            Object.prototype.toString.call(input) === '[object Array]'
    		        );
    		    }

    		    function isObject(input) {
    		        // IE8 will treat undefined and null as object if it wasn't for
    		        // input != null
    		        return (
    		            input != null &&
    		            Object.prototype.toString.call(input) === '[object Object]'
    		        );
    		    }

    		    function hasOwnProp(a, b) {
    		        return Object.prototype.hasOwnProperty.call(a, b);
    		    }

    		    function isObjectEmpty(obj) {
    		        if (Object.getOwnPropertyNames) {
    		            return Object.getOwnPropertyNames(obj).length === 0;
    		        } else {
    		            var k;
    		            for (k in obj) {
    		                if (hasOwnProp(obj, k)) {
    		                    return false;
    		                }
    		            }
    		            return true;
    		        }
    		    }

    		    function isUndefined(input) {
    		        return input === undefined;
    		    }

    		    function isNumber(input) {
    		        return (
    		            typeof input === 'number' ||
    		            Object.prototype.toString.call(input) === '[object Number]'
    		        );
    		    }

    		    function isDate(input) {
    		        return (
    		            input instanceof Date ||
    		            Object.prototype.toString.call(input) === '[object Date]'
    		        );
    		    }

    		    function map(arr, fn) {
    		        var res = [],
    		            i,
    		            arrLen = arr.length;
    		        for (i = 0; i < arrLen; ++i) {
    		            res.push(fn(arr[i], i));
    		        }
    		        return res;
    		    }

    		    function extend(a, b) {
    		        for (var i in b) {
    		            if (hasOwnProp(b, i)) {
    		                a[i] = b[i];
    		            }
    		        }

    		        if (hasOwnProp(b, 'toString')) {
    		            a.toString = b.toString;
    		        }

    		        if (hasOwnProp(b, 'valueOf')) {
    		            a.valueOf = b.valueOf;
    		        }

    		        return a;
    		    }

    		    function createUTC(input, format, locale, strict) {
    		        return createLocalOrUTC(input, format, locale, strict, true).utc();
    		    }

    		    function defaultParsingFlags() {
    		        // We need to deep clone this object.
    		        return {
    		            empty: false,
    		            unusedTokens: [],
    		            unusedInput: [],
    		            overflow: -2,
    		            charsLeftOver: 0,
    		            nullInput: false,
    		            invalidEra: null,
    		            invalidMonth: null,
    		            invalidFormat: false,
    		            userInvalidated: false,
    		            iso: false,
    		            parsedDateParts: [],
    		            era: null,
    		            meridiem: null,
    		            rfc2822: false,
    		            weekdayMismatch: false,
    		        };
    		    }

    		    function getParsingFlags(m) {
    		        if (m._pf == null) {
    		            m._pf = defaultParsingFlags();
    		        }
    		        return m._pf;
    		    }

    		    var some;
    		    if (Array.prototype.some) {
    		        some = Array.prototype.some;
    		    } else {
    		        some = function (fun) {
    		            var t = Object(this),
    		                len = t.length >>> 0,
    		                i;

    		            for (i = 0; i < len; i++) {
    		                if (i in t && fun.call(this, t[i], i, t)) {
    		                    return true;
    		                }
    		            }

    		            return false;
    		        };
    		    }

    		    function isValid(m) {
    		        var flags = null,
    		            parsedParts = false,
    		            isNowValid = m._d && !isNaN(m._d.getTime());
    		        if (isNowValid) {
    		            flags = getParsingFlags(m);
    		            parsedParts = some.call(flags.parsedDateParts, function (i) {
    		                return i != null;
    		            });
    		            isNowValid =
    		                flags.overflow < 0 &&
    		                !flags.empty &&
    		                !flags.invalidEra &&
    		                !flags.invalidMonth &&
    		                !flags.invalidWeekday &&
    		                !flags.weekdayMismatch &&
    		                !flags.nullInput &&
    		                !flags.invalidFormat &&
    		                !flags.userInvalidated &&
    		                (!flags.meridiem || (flags.meridiem && parsedParts));
    		            if (m._strict) {
    		                isNowValid =
    		                    isNowValid &&
    		                    flags.charsLeftOver === 0 &&
    		                    flags.unusedTokens.length === 0 &&
    		                    flags.bigHour === undefined;
    		            }
    		        }
    		        if (Object.isFrozen == null || !Object.isFrozen(m)) {
    		            m._isValid = isNowValid;
    		        } else {
    		            return isNowValid;
    		        }
    		        return m._isValid;
    		    }

    		    function createInvalid(flags) {
    		        var m = createUTC(NaN);
    		        if (flags != null) {
    		            extend(getParsingFlags(m), flags);
    		        } else {
    		            getParsingFlags(m).userInvalidated = true;
    		        }

    		        return m;
    		    }

    		    // Plugins that add properties should also add the key here (null value),
    		    // so we can properly clone ourselves.
    		    var momentProperties = (hooks.momentProperties = []),
    		        updateInProgress = false;

    		    function copyConfig(to, from) {
    		        var i,
    		            prop,
    		            val,
    		            momentPropertiesLen = momentProperties.length;

    		        if (!isUndefined(from._isAMomentObject)) {
    		            to._isAMomentObject = from._isAMomentObject;
    		        }
    		        if (!isUndefined(from._i)) {
    		            to._i = from._i;
    		        }
    		        if (!isUndefined(from._f)) {
    		            to._f = from._f;
    		        }
    		        if (!isUndefined(from._l)) {
    		            to._l = from._l;
    		        }
    		        if (!isUndefined(from._strict)) {
    		            to._strict = from._strict;
    		        }
    		        if (!isUndefined(from._tzm)) {
    		            to._tzm = from._tzm;
    		        }
    		        if (!isUndefined(from._isUTC)) {
    		            to._isUTC = from._isUTC;
    		        }
    		        if (!isUndefined(from._offset)) {
    		            to._offset = from._offset;
    		        }
    		        if (!isUndefined(from._pf)) {
    		            to._pf = getParsingFlags(from);
    		        }
    		        if (!isUndefined(from._locale)) {
    		            to._locale = from._locale;
    		        }

    		        if (momentPropertiesLen > 0) {
    		            for (i = 0; i < momentPropertiesLen; i++) {
    		                prop = momentProperties[i];
    		                val = from[prop];
    		                if (!isUndefined(val)) {
    		                    to[prop] = val;
    		                }
    		            }
    		        }

    		        return to;
    		    }

    		    // Moment prototype object
    		    function Moment(config) {
    		        copyConfig(this, config);
    		        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
    		        if (!this.isValid()) {
    		            this._d = new Date(NaN);
    		        }
    		        // Prevent infinite loop in case updateOffset creates new moment
    		        // objects.
    		        if (updateInProgress === false) {
    		            updateInProgress = true;
    		            hooks.updateOffset(this);
    		            updateInProgress = false;
    		        }
    		    }

    		    function isMoment(obj) {
    		        return (
    		            obj instanceof Moment || (obj != null && obj._isAMomentObject != null)
    		        );
    		    }

    		    function warn(msg) {
    		        if (
    		            hooks.suppressDeprecationWarnings === false &&
    		            typeof console !== 'undefined' &&
    		            console.warn
    		        ) {
    		            console.warn('Deprecation warning: ' + msg);
    		        }
    		    }

    		    function deprecate(msg, fn) {
    		        var firstTime = true;

    		        return extend(function () {
    		            if (hooks.deprecationHandler != null) {
    		                hooks.deprecationHandler(null, msg);
    		            }
    		            if (firstTime) {
    		                var args = [],
    		                    arg,
    		                    i,
    		                    key,
    		                    argLen = arguments.length;
    		                for (i = 0; i < argLen; i++) {
    		                    arg = '';
    		                    if (typeof arguments[i] === 'object') {
    		                        arg += '\n[' + i + '] ';
    		                        for (key in arguments[0]) {
    		                            if (hasOwnProp(arguments[0], key)) {
    		                                arg += key + ': ' + arguments[0][key] + ', ';
    		                            }
    		                        }
    		                        arg = arg.slice(0, -2); // Remove trailing comma and space
    		                    } else {
    		                        arg = arguments[i];
    		                    }
    		                    args.push(arg);
    		                }
    		                warn(
    		                    msg +
    		                        '\nArguments: ' +
    		                        Array.prototype.slice.call(args).join('') +
    		                        '\n' +
    		                        new Error().stack
    		                );
    		                firstTime = false;
    		            }
    		            return fn.apply(this, arguments);
    		        }, fn);
    		    }

    		    var deprecations = {};

    		    function deprecateSimple(name, msg) {
    		        if (hooks.deprecationHandler != null) {
    		            hooks.deprecationHandler(name, msg);
    		        }
    		        if (!deprecations[name]) {
    		            warn(msg);
    		            deprecations[name] = true;
    		        }
    		    }

    		    hooks.suppressDeprecationWarnings = false;
    		    hooks.deprecationHandler = null;

    		    function isFunction(input) {
    		        return (
    		            (typeof Function !== 'undefined' && input instanceof Function) ||
    		            Object.prototype.toString.call(input) === '[object Function]'
    		        );
    		    }

    		    function set(config) {
    		        var prop, i;
    		        for (i in config) {
    		            if (hasOwnProp(config, i)) {
    		                prop = config[i];
    		                if (isFunction(prop)) {
    		                    this[i] = prop;
    		                } else {
    		                    this['_' + i] = prop;
    		                }
    		            }
    		        }
    		        this._config = config;
    		        // Lenient ordinal parsing accepts just a number in addition to
    		        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
    		        // TODO: Remove "ordinalParse" fallback in next major release.
    		        this._dayOfMonthOrdinalParseLenient = new RegExp(
    		            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
    		                '|' +
    		                /\d{1,2}/.source
    		        );
    		    }

    		    function mergeConfigs(parentConfig, childConfig) {
    		        var res = extend({}, parentConfig),
    		            prop;
    		        for (prop in childConfig) {
    		            if (hasOwnProp(childConfig, prop)) {
    		                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
    		                    res[prop] = {};
    		                    extend(res[prop], parentConfig[prop]);
    		                    extend(res[prop], childConfig[prop]);
    		                } else if (childConfig[prop] != null) {
    		                    res[prop] = childConfig[prop];
    		                } else {
    		                    delete res[prop];
    		                }
    		            }
    		        }
    		        for (prop in parentConfig) {
    		            if (
    		                hasOwnProp(parentConfig, prop) &&
    		                !hasOwnProp(childConfig, prop) &&
    		                isObject(parentConfig[prop])
    		            ) {
    		                // make sure changes to properties don't modify parent config
    		                res[prop] = extend({}, res[prop]);
    		            }
    		        }
    		        return res;
    		    }

    		    function Locale(config) {
    		        if (config != null) {
    		            this.set(config);
    		        }
    		    }

    		    var keys;

    		    if (Object.keys) {
    		        keys = Object.keys;
    		    } else {
    		        keys = function (obj) {
    		            var i,
    		                res = [];
    		            for (i in obj) {
    		                if (hasOwnProp(obj, i)) {
    		                    res.push(i);
    		                }
    		            }
    		            return res;
    		        };
    		    }

    		    var defaultCalendar = {
    		        sameDay: '[Today at] LT',
    		        nextDay: '[Tomorrow at] LT',
    		        nextWeek: 'dddd [at] LT',
    		        lastDay: '[Yesterday at] LT',
    		        lastWeek: '[Last] dddd [at] LT',
    		        sameElse: 'L',
    		    };

    		    function calendar(key, mom, now) {
    		        var output = this._calendar[key] || this._calendar['sameElse'];
    		        return isFunction(output) ? output.call(mom, now) : output;
    		    }

    		    function zeroFill(number, targetLength, forceSign) {
    		        var absNumber = '' + Math.abs(number),
    		            zerosToFill = targetLength - absNumber.length,
    		            sign = number >= 0;
    		        return (
    		            (sign ? (forceSign ? '+' : '') : '-') +
    		            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) +
    		            absNumber
    		        );
    		    }

    		    var formattingTokens =
    		            /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
    		        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
    		        formatFunctions = {},
    		        formatTokenFunctions = {};

    		    // token:    'M'
    		    // padded:   ['MM', 2]
    		    // ordinal:  'Mo'
    		    // callback: function () { this.month() + 1 }
    		    function addFormatToken(token, padded, ordinal, callback) {
    		        var func = callback;
    		        if (typeof callback === 'string') {
    		            func = function () {
    		                return this[callback]();
    		            };
    		        }
    		        if (token) {
    		            formatTokenFunctions[token] = func;
    		        }
    		        if (padded) {
    		            formatTokenFunctions[padded[0]] = function () {
    		                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
    		            };
    		        }
    		        if (ordinal) {
    		            formatTokenFunctions[ordinal] = function () {
    		                return this.localeData().ordinal(
    		                    func.apply(this, arguments),
    		                    token
    		                );
    		            };
    		        }
    		    }

    		    function removeFormattingTokens(input) {
    		        if (input.match(/\[[\s\S]/)) {
    		            return input.replace(/^\[|\]$/g, '');
    		        }
    		        return input.replace(/\\/g, '');
    		    }

    		    function makeFormatFunction(format) {
    		        var array = format.match(formattingTokens),
    		            i,
    		            length;

    		        for (i = 0, length = array.length; i < length; i++) {
    		            if (formatTokenFunctions[array[i]]) {
    		                array[i] = formatTokenFunctions[array[i]];
    		            } else {
    		                array[i] = removeFormattingTokens(array[i]);
    		            }
    		        }

    		        return function (mom) {
    		            var output = '',
    		                i;
    		            for (i = 0; i < length; i++) {
    		                output += isFunction(array[i])
    		                    ? array[i].call(mom, format)
    		                    : array[i];
    		            }
    		            return output;
    		        };
    		    }

    		    // format date using native date object
    		    function formatMoment(m, format) {
    		        if (!m.isValid()) {
    		            return m.localeData().invalidDate();
    		        }

    		        format = expandFormat(format, m.localeData());
    		        formatFunctions[format] =
    		            formatFunctions[format] || makeFormatFunction(format);

    		        return formatFunctions[format](m);
    		    }

    		    function expandFormat(format, locale) {
    		        var i = 5;

    		        function replaceLongDateFormatTokens(input) {
    		            return locale.longDateFormat(input) || input;
    		        }

    		        localFormattingTokens.lastIndex = 0;
    		        while (i >= 0 && localFormattingTokens.test(format)) {
    		            format = format.replace(
    		                localFormattingTokens,
    		                replaceLongDateFormatTokens
    		            );
    		            localFormattingTokens.lastIndex = 0;
    		            i -= 1;
    		        }

    		        return format;
    		    }

    		    var defaultLongDateFormat = {
    		        LTS: 'h:mm:ss A',
    		        LT: 'h:mm A',
    		        L: 'MM/DD/YYYY',
    		        LL: 'MMMM D, YYYY',
    		        LLL: 'MMMM D, YYYY h:mm A',
    		        LLLL: 'dddd, MMMM D, YYYY h:mm A',
    		    };

    		    function longDateFormat(key) {
    		        var format = this._longDateFormat[key],
    		            formatUpper = this._longDateFormat[key.toUpperCase()];

    		        if (format || !formatUpper) {
    		            return format;
    		        }

    		        this._longDateFormat[key] = formatUpper
    		            .match(formattingTokens)
    		            .map(function (tok) {
    		                if (
    		                    tok === 'MMMM' ||
    		                    tok === 'MM' ||
    		                    tok === 'DD' ||
    		                    tok === 'dddd'
    		                ) {
    		                    return tok.slice(1);
    		                }
    		                return tok;
    		            })
    		            .join('');

    		        return this._longDateFormat[key];
    		    }

    		    var defaultInvalidDate = 'Invalid date';

    		    function invalidDate() {
    		        return this._invalidDate;
    		    }

    		    var defaultOrdinal = '%d',
    		        defaultDayOfMonthOrdinalParse = /\d{1,2}/;

    		    function ordinal(number) {
    		        return this._ordinal.replace('%d', number);
    		    }

    		    var defaultRelativeTime = {
    		        future: 'in %s',
    		        past: '%s ago',
    		        s: 'a few seconds',
    		        ss: '%d seconds',
    		        m: 'a minute',
    		        mm: '%d minutes',
    		        h: 'an hour',
    		        hh: '%d hours',
    		        d: 'a day',
    		        dd: '%d days',
    		        w: 'a week',
    		        ww: '%d weeks',
    		        M: 'a month',
    		        MM: '%d months',
    		        y: 'a year',
    		        yy: '%d years',
    		    };

    		    function relativeTime(number, withoutSuffix, string, isFuture) {
    		        var output = this._relativeTime[string];
    		        return isFunction(output)
    		            ? output(number, withoutSuffix, string, isFuture)
    		            : output.replace(/%d/i, number);
    		    }

    		    function pastFuture(diff, output) {
    		        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
    		        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    		    }

    		    var aliases = {
    		        D: 'date',
    		        dates: 'date',
    		        date: 'date',
    		        d: 'day',
    		        days: 'day',
    		        day: 'day',
    		        e: 'weekday',
    		        weekdays: 'weekday',
    		        weekday: 'weekday',
    		        E: 'isoWeekday',
    		        isoweekdays: 'isoWeekday',
    		        isoweekday: 'isoWeekday',
    		        DDD: 'dayOfYear',
    		        dayofyears: 'dayOfYear',
    		        dayofyear: 'dayOfYear',
    		        h: 'hour',
    		        hours: 'hour',
    		        hour: 'hour',
    		        ms: 'millisecond',
    		        milliseconds: 'millisecond',
    		        millisecond: 'millisecond',
    		        m: 'minute',
    		        minutes: 'minute',
    		        minute: 'minute',
    		        M: 'month',
    		        months: 'month',
    		        month: 'month',
    		        Q: 'quarter',
    		        quarters: 'quarter',
    		        quarter: 'quarter',
    		        s: 'second',
    		        seconds: 'second',
    		        second: 'second',
    		        gg: 'weekYear',
    		        weekyears: 'weekYear',
    		        weekyear: 'weekYear',
    		        GG: 'isoWeekYear',
    		        isoweekyears: 'isoWeekYear',
    		        isoweekyear: 'isoWeekYear',
    		        w: 'week',
    		        weeks: 'week',
    		        week: 'week',
    		        W: 'isoWeek',
    		        isoweeks: 'isoWeek',
    		        isoweek: 'isoWeek',
    		        y: 'year',
    		        years: 'year',
    		        year: 'year',
    		    };

    		    function normalizeUnits(units) {
    		        return typeof units === 'string'
    		            ? aliases[units] || aliases[units.toLowerCase()]
    		            : undefined;
    		    }

    		    function normalizeObjectUnits(inputObject) {
    		        var normalizedInput = {},
    		            normalizedProp,
    		            prop;

    		        for (prop in inputObject) {
    		            if (hasOwnProp(inputObject, prop)) {
    		                normalizedProp = normalizeUnits(prop);
    		                if (normalizedProp) {
    		                    normalizedInput[normalizedProp] = inputObject[prop];
    		                }
    		            }
    		        }

    		        return normalizedInput;
    		    }

    		    var priorities = {
    		        date: 9,
    		        day: 11,
    		        weekday: 11,
    		        isoWeekday: 11,
    		        dayOfYear: 4,
    		        hour: 13,
    		        millisecond: 16,
    		        minute: 14,
    		        month: 8,
    		        quarter: 7,
    		        second: 15,
    		        weekYear: 1,
    		        isoWeekYear: 1,
    		        week: 5,
    		        isoWeek: 5,
    		        year: 1,
    		    };

    		    function getPrioritizedUnits(unitsObj) {
    		        var units = [],
    		            u;
    		        for (u in unitsObj) {
    		            if (hasOwnProp(unitsObj, u)) {
    		                units.push({ unit: u, priority: priorities[u] });
    		            }
    		        }
    		        units.sort(function (a, b) {
    		            return a.priority - b.priority;
    		        });
    		        return units;
    		    }

    		    var match1 = /\d/, //       0 - 9
    		        match2 = /\d\d/, //      00 - 99
    		        match3 = /\d{3}/, //     000 - 999
    		        match4 = /\d{4}/, //    0000 - 9999
    		        match6 = /[+-]?\d{6}/, // -999999 - 999999
    		        match1to2 = /\d\d?/, //       0 - 99
    		        match3to4 = /\d\d\d\d?/, //     999 - 9999
    		        match5to6 = /\d\d\d\d\d\d?/, //   99999 - 999999
    		        match1to3 = /\d{1,3}/, //       0 - 999
    		        match1to4 = /\d{1,4}/, //       0 - 9999
    		        match1to6 = /[+-]?\d{1,6}/, // -999999 - 999999
    		        matchUnsigned = /\d+/, //       0 - inf
    		        matchSigned = /[+-]?\d+/, //    -inf - inf
    		        matchOffset = /Z|[+-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
    		        matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi, // +00 -00 +00:00 -00:00 +0000 -0000 or Z
    		        matchTimestamp = /[+-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
    		        // any word (or two) characters or numbers including two/three word month in arabic.
    		        // includes scottish gaelic two word and hyphenated months
    		        matchWord =
    		            /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,
    		        match1to2NoLeadingZero = /^[1-9]\d?/, //         1-99
    		        match1to2HasZero = /^([1-9]\d|\d)/, //           0-99
    		        regexes;

    		    regexes = {};

    		    function addRegexToken(token, regex, strictRegex) {
    		        regexes[token] = isFunction(regex)
    		            ? regex
    		            : function (isStrict, localeData) {
    		                  return isStrict && strictRegex ? strictRegex : regex;
    		              };
    		    }

    		    function getParseRegexForToken(token, config) {
    		        if (!hasOwnProp(regexes, token)) {
    		            return new RegExp(unescapeFormat(token));
    		        }

    		        return regexes[token](config._strict, config._locale);
    		    }

    		    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    		    function unescapeFormat(s) {
    		        return regexEscape(
    		            s
    		                .replace('\\', '')
    		                .replace(
    		                    /\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,
    		                    function (matched, p1, p2, p3, p4) {
    		                        return p1 || p2 || p3 || p4;
    		                    }
    		                )
    		        );
    		    }

    		    function regexEscape(s) {
    		        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    		    }

    		    function absFloor(number) {
    		        if (number < 0) {
    		            // -0 -> 0
    		            return Math.ceil(number) || 0;
    		        } else {
    		            return Math.floor(number);
    		        }
    		    }

    		    function toInt(argumentForCoercion) {
    		        var coercedNumber = +argumentForCoercion,
    		            value = 0;

    		        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
    		            value = absFloor(coercedNumber);
    		        }

    		        return value;
    		    }

    		    var tokens = {};

    		    function addParseToken(token, callback) {
    		        var i,
    		            func = callback,
    		            tokenLen;
    		        if (typeof token === 'string') {
    		            token = [token];
    		        }
    		        if (isNumber(callback)) {
    		            func = function (input, array) {
    		                array[callback] = toInt(input);
    		            };
    		        }
    		        tokenLen = token.length;
    		        for (i = 0; i < tokenLen; i++) {
    		            tokens[token[i]] = func;
    		        }
    		    }

    		    function addWeekParseToken(token, callback) {
    		        addParseToken(token, function (input, array, config, token) {
    		            config._w = config._w || {};
    		            callback(input, config._w, config, token);
    		        });
    		    }

    		    function addTimeToArrayFromToken(token, input, config) {
    		        if (input != null && hasOwnProp(tokens, token)) {
    		            tokens[token](input, config._a, config, token);
    		        }
    		    }

    		    function isLeapYear(year) {
    		        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    		    }

    		    var YEAR = 0,
    		        MONTH = 1,
    		        DATE = 2,
    		        HOUR = 3,
    		        MINUTE = 4,
    		        SECOND = 5,
    		        MILLISECOND = 6,
    		        WEEK = 7,
    		        WEEKDAY = 8;

    		    // FORMATTING

    		    addFormatToken('Y', 0, 0, function () {
    		        var y = this.year();
    		        return y <= 9999 ? zeroFill(y, 4) : '+' + y;
    		    });

    		    addFormatToken(0, ['YY', 2], 0, function () {
    		        return this.year() % 100;
    		    });

    		    addFormatToken(0, ['YYYY', 4], 0, 'year');
    		    addFormatToken(0, ['YYYYY', 5], 0, 'year');
    		    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    		    // PARSING

    		    addRegexToken('Y', matchSigned);
    		    addRegexToken('YY', match1to2, match2);
    		    addRegexToken('YYYY', match1to4, match4);
    		    addRegexToken('YYYYY', match1to6, match6);
    		    addRegexToken('YYYYYY', match1to6, match6);

    		    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    		    addParseToken('YYYY', function (input, array) {
    		        array[YEAR] =
    		            input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
    		    });
    		    addParseToken('YY', function (input, array) {
    		        array[YEAR] = hooks.parseTwoDigitYear(input);
    		    });
    		    addParseToken('Y', function (input, array) {
    		        array[YEAR] = parseInt(input, 10);
    		    });

    		    // HELPERS

    		    function daysInYear(year) {
    		        return isLeapYear(year) ? 366 : 365;
    		    }

    		    // HOOKS

    		    hooks.parseTwoDigitYear = function (input) {
    		        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    		    };

    		    // MOMENTS

    		    var getSetYear = makeGetSet('FullYear', true);

    		    function getIsLeapYear() {
    		        return isLeapYear(this.year());
    		    }

    		    function makeGetSet(unit, keepTime) {
    		        return function (value) {
    		            if (value != null) {
    		                set$1(this, unit, value);
    		                hooks.updateOffset(this, keepTime);
    		                return this;
    		            } else {
    		                return get(this, unit);
    		            }
    		        };
    		    }

    		    function get(mom, unit) {
    		        if (!mom.isValid()) {
    		            return NaN;
    		        }

    		        var d = mom._d,
    		            isUTC = mom._isUTC;

    		        switch (unit) {
    		            case 'Milliseconds':
    		                return isUTC ? d.getUTCMilliseconds() : d.getMilliseconds();
    		            case 'Seconds':
    		                return isUTC ? d.getUTCSeconds() : d.getSeconds();
    		            case 'Minutes':
    		                return isUTC ? d.getUTCMinutes() : d.getMinutes();
    		            case 'Hours':
    		                return isUTC ? d.getUTCHours() : d.getHours();
    		            case 'Date':
    		                return isUTC ? d.getUTCDate() : d.getDate();
    		            case 'Day':
    		                return isUTC ? d.getUTCDay() : d.getDay();
    		            case 'Month':
    		                return isUTC ? d.getUTCMonth() : d.getMonth();
    		            case 'FullYear':
    		                return isUTC ? d.getUTCFullYear() : d.getFullYear();
    		            default:
    		                return NaN; // Just in case
    		        }
    		    }

    		    function set$1(mom, unit, value) {
    		        var d, isUTC, year, month, date;

    		        if (!mom.isValid() || isNaN(value)) {
    		            return;
    		        }

    		        d = mom._d;
    		        isUTC = mom._isUTC;

    		        switch (unit) {
    		            case 'Milliseconds':
    		                return void (isUTC
    		                    ? d.setUTCMilliseconds(value)
    		                    : d.setMilliseconds(value));
    		            case 'Seconds':
    		                return void (isUTC ? d.setUTCSeconds(value) : d.setSeconds(value));
    		            case 'Minutes':
    		                return void (isUTC ? d.setUTCMinutes(value) : d.setMinutes(value));
    		            case 'Hours':
    		                return void (isUTC ? d.setUTCHours(value) : d.setHours(value));
    		            case 'Date':
    		                return void (isUTC ? d.setUTCDate(value) : d.setDate(value));
    		            // case 'Day': // Not real
    		            //    return void (isUTC ? d.setUTCDay(value) : d.setDay(value));
    		            // case 'Month': // Not used because we need to pass two variables
    		            //     return void (isUTC ? d.setUTCMonth(value) : d.setMonth(value));
    		            case 'FullYear':
    		                break; // See below ...
    		            default:
    		                return; // Just in case
    		        }

    		        year = value;
    		        month = mom.month();
    		        date = mom.date();
    		        date = date === 29 && month === 1 && !isLeapYear(year) ? 28 : date;
    		        void (isUTC
    		            ? d.setUTCFullYear(year, month, date)
    		            : d.setFullYear(year, month, date));
    		    }

    		    // MOMENTS

    		    function stringGet(units) {
    		        units = normalizeUnits(units);
    		        if (isFunction(this[units])) {
    		            return this[units]();
    		        }
    		        return this;
    		    }

    		    function stringSet(units, value) {
    		        if (typeof units === 'object') {
    		            units = normalizeObjectUnits(units);
    		            var prioritized = getPrioritizedUnits(units),
    		                i,
    		                prioritizedLen = prioritized.length;
    		            for (i = 0; i < prioritizedLen; i++) {
    		                this[prioritized[i].unit](units[prioritized[i].unit]);
    		            }
    		        } else {
    		            units = normalizeUnits(units);
    		            if (isFunction(this[units])) {
    		                return this[units](value);
    		            }
    		        }
    		        return this;
    		    }

    		    function mod(n, x) {
    		        return ((n % x) + x) % x;
    		    }

    		    var indexOf;

    		    if (Array.prototype.indexOf) {
    		        indexOf = Array.prototype.indexOf;
    		    } else {
    		        indexOf = function (o) {
    		            // I know
    		            var i;
    		            for (i = 0; i < this.length; ++i) {
    		                if (this[i] === o) {
    		                    return i;
    		                }
    		            }
    		            return -1;
    		        };
    		    }

    		    function daysInMonth(year, month) {
    		        if (isNaN(year) || isNaN(month)) {
    		            return NaN;
    		        }
    		        var modMonth = mod(month, 12);
    		        year += (month - modMonth) / 12;
    		        return modMonth === 1
    		            ? isLeapYear(year)
    		                ? 29
    		                : 28
    		            : 31 - ((modMonth % 7) % 2);
    		    }

    		    // FORMATTING

    		    addFormatToken('M', ['MM', 2], 'Mo', function () {
    		        return this.month() + 1;
    		    });

    		    addFormatToken('MMM', 0, 0, function (format) {
    		        return this.localeData().monthsShort(this, format);
    		    });

    		    addFormatToken('MMMM', 0, 0, function (format) {
    		        return this.localeData().months(this, format);
    		    });

    		    // PARSING

    		    addRegexToken('M', match1to2, match1to2NoLeadingZero);
    		    addRegexToken('MM', match1to2, match2);
    		    addRegexToken('MMM', function (isStrict, locale) {
    		        return locale.monthsShortRegex(isStrict);
    		    });
    		    addRegexToken('MMMM', function (isStrict, locale) {
    		        return locale.monthsRegex(isStrict);
    		    });

    		    addParseToken(['M', 'MM'], function (input, array) {
    		        array[MONTH] = toInt(input) - 1;
    		    });

    		    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
    		        var month = config._locale.monthsParse(input, token, config._strict);
    		        // if we didn't find a month name, mark the date as invalid.
    		        if (month != null) {
    		            array[MONTH] = month;
    		        } else {
    		            getParsingFlags(config).invalidMonth = input;
    		        }
    		    });

    		    // LOCALES

    		    var defaultLocaleMonths =
    		            'January_February_March_April_May_June_July_August_September_October_November_December'.split(
    		                '_'
    		            ),
    		        defaultLocaleMonthsShort =
    		            'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
    		        MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,
    		        defaultMonthsShortRegex = matchWord,
    		        defaultMonthsRegex = matchWord;

    		    function localeMonths(m, format) {
    		        if (!m) {
    		            return isArray(this._months)
    		                ? this._months
    		                : this._months['standalone'];
    		        }
    		        return isArray(this._months)
    		            ? this._months[m.month()]
    		            : this._months[
    		                  (this._months.isFormat || MONTHS_IN_FORMAT).test(format)
    		                      ? 'format'
    		                      : 'standalone'
    		              ][m.month()];
    		    }

    		    function localeMonthsShort(m, format) {
    		        if (!m) {
    		            return isArray(this._monthsShort)
    		                ? this._monthsShort
    		                : this._monthsShort['standalone'];
    		        }
    		        return isArray(this._monthsShort)
    		            ? this._monthsShort[m.month()]
    		            : this._monthsShort[
    		                  MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'
    		              ][m.month()];
    		    }

    		    function handleStrictParse(monthName, format, strict) {
    		        var i,
    		            ii,
    		            mom,
    		            llc = monthName.toLocaleLowerCase();
    		        if (!this._monthsParse) {
    		            // this is not used
    		            this._monthsParse = [];
    		            this._longMonthsParse = [];
    		            this._shortMonthsParse = [];
    		            for (i = 0; i < 12; ++i) {
    		                mom = createUTC([2000, i]);
    		                this._shortMonthsParse[i] = this.monthsShort(
    		                    mom,
    		                    ''
    		                ).toLocaleLowerCase();
    		                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
    		            }
    		        }

    		        if (strict) {
    		            if (format === 'MMM') {
    		                ii = indexOf.call(this._shortMonthsParse, llc);
    		                return ii !== -1 ? ii : null;
    		            } else {
    		                ii = indexOf.call(this._longMonthsParse, llc);
    		                return ii !== -1 ? ii : null;
    		            }
    		        } else {
    		            if (format === 'MMM') {
    		                ii = indexOf.call(this._shortMonthsParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._longMonthsParse, llc);
    		                return ii !== -1 ? ii : null;
    		            } else {
    		                ii = indexOf.call(this._longMonthsParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._shortMonthsParse, llc);
    		                return ii !== -1 ? ii : null;
    		            }
    		        }
    		    }

    		    function localeMonthsParse(monthName, format, strict) {
    		        var i, mom, regex;

    		        if (this._monthsParseExact) {
    		            return handleStrictParse.call(this, monthName, format, strict);
    		        }

    		        if (!this._monthsParse) {
    		            this._monthsParse = [];
    		            this._longMonthsParse = [];
    		            this._shortMonthsParse = [];
    		        }

    		        // TODO: add sorting
    		        // Sorting makes sure if one month (or abbr) is a prefix of another
    		        // see sorting in computeMonthsParse
    		        for (i = 0; i < 12; i++) {
    		            // make the regex if we don't have it already
    		            mom = createUTC([2000, i]);
    		            if (strict && !this._longMonthsParse[i]) {
    		                this._longMonthsParse[i] = new RegExp(
    		                    '^' + this.months(mom, '').replace('.', '') + '$',
    		                    'i'
    		                );
    		                this._shortMonthsParse[i] = new RegExp(
    		                    '^' + this.monthsShort(mom, '').replace('.', '') + '$',
    		                    'i'
    		                );
    		            }
    		            if (!strict && !this._monthsParse[i]) {
    		                regex =
    		                    '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
    		                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
    		            }
    		            // test the regex
    		            if (
    		                strict &&
    		                format === 'MMMM' &&
    		                this._longMonthsParse[i].test(monthName)
    		            ) {
    		                return i;
    		            } else if (
    		                strict &&
    		                format === 'MMM' &&
    		                this._shortMonthsParse[i].test(monthName)
    		            ) {
    		                return i;
    		            } else if (!strict && this._monthsParse[i].test(monthName)) {
    		                return i;
    		            }
    		        }
    		    }

    		    // MOMENTS

    		    function setMonth(mom, value) {
    		        if (!mom.isValid()) {
    		            // No op
    		            return mom;
    		        }

    		        if (typeof value === 'string') {
    		            if (/^\d+$/.test(value)) {
    		                value = toInt(value);
    		            } else {
    		                value = mom.localeData().monthsParse(value);
    		                // TODO: Another silent failure?
    		                if (!isNumber(value)) {
    		                    return mom;
    		                }
    		            }
    		        }

    		        var month = value,
    		            date = mom.date();

    		        date = date < 29 ? date : Math.min(date, daysInMonth(mom.year(), month));
    		        void (mom._isUTC
    		            ? mom._d.setUTCMonth(month, date)
    		            : mom._d.setMonth(month, date));
    		        return mom;
    		    }

    		    function getSetMonth(value) {
    		        if (value != null) {
    		            setMonth(this, value);
    		            hooks.updateOffset(this, true);
    		            return this;
    		        } else {
    		            return get(this, 'Month');
    		        }
    		    }

    		    function getDaysInMonth() {
    		        return daysInMonth(this.year(), this.month());
    		    }

    		    function monthsShortRegex(isStrict) {
    		        if (this._monthsParseExact) {
    		            if (!hasOwnProp(this, '_monthsRegex')) {
    		                computeMonthsParse.call(this);
    		            }
    		            if (isStrict) {
    		                return this._monthsShortStrictRegex;
    		            } else {
    		                return this._monthsShortRegex;
    		            }
    		        } else {
    		            if (!hasOwnProp(this, '_monthsShortRegex')) {
    		                this._monthsShortRegex = defaultMonthsShortRegex;
    		            }
    		            return this._monthsShortStrictRegex && isStrict
    		                ? this._monthsShortStrictRegex
    		                : this._monthsShortRegex;
    		        }
    		    }

    		    function monthsRegex(isStrict) {
    		        if (this._monthsParseExact) {
    		            if (!hasOwnProp(this, '_monthsRegex')) {
    		                computeMonthsParse.call(this);
    		            }
    		            if (isStrict) {
    		                return this._monthsStrictRegex;
    		            } else {
    		                return this._monthsRegex;
    		            }
    		        } else {
    		            if (!hasOwnProp(this, '_monthsRegex')) {
    		                this._monthsRegex = defaultMonthsRegex;
    		            }
    		            return this._monthsStrictRegex && isStrict
    		                ? this._monthsStrictRegex
    		                : this._monthsRegex;
    		        }
    		    }

    		    function computeMonthsParse() {
    		        function cmpLenRev(a, b) {
    		            return b.length - a.length;
    		        }

    		        var shortPieces = [],
    		            longPieces = [],
    		            mixedPieces = [],
    		            i,
    		            mom,
    		            shortP,
    		            longP;
    		        for (i = 0; i < 12; i++) {
    		            // make the regex if we don't have it already
    		            mom = createUTC([2000, i]);
    		            shortP = regexEscape(this.monthsShort(mom, ''));
    		            longP = regexEscape(this.months(mom, ''));
    		            shortPieces.push(shortP);
    		            longPieces.push(longP);
    		            mixedPieces.push(longP);
    		            mixedPieces.push(shortP);
    		        }
    		        // Sorting makes sure if one month (or abbr) is a prefix of another it
    		        // will match the longer piece.
    		        shortPieces.sort(cmpLenRev);
    		        longPieces.sort(cmpLenRev);
    		        mixedPieces.sort(cmpLenRev);

    		        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    		        this._monthsShortRegex = this._monthsRegex;
    		        this._monthsStrictRegex = new RegExp(
    		            '^(' + longPieces.join('|') + ')',
    		            'i'
    		        );
    		        this._monthsShortStrictRegex = new RegExp(
    		            '^(' + shortPieces.join('|') + ')',
    		            'i'
    		        );
    		    }

    		    function createDate(y, m, d, h, M, s, ms) {
    		        // can't just apply() to create a date:
    		        // https://stackoverflow.com/q/181348
    		        var date;
    		        // the date constructor remaps years 0-99 to 1900-1999
    		        if (y < 100 && y >= 0) {
    		            // preserve leap years using a full 400 year cycle, then reset
    		            date = new Date(y + 400, m, d, h, M, s, ms);
    		            if (isFinite(date.getFullYear())) {
    		                date.setFullYear(y);
    		            }
    		        } else {
    		            date = new Date(y, m, d, h, M, s, ms);
    		        }

    		        return date;
    		    }

    		    function createUTCDate(y) {
    		        var date, args;
    		        // the Date.UTC function remaps years 0-99 to 1900-1999
    		        if (y < 100 && y >= 0) {
    		            args = Array.prototype.slice.call(arguments);
    		            // preserve leap years using a full 400 year cycle, then reset
    		            args[0] = y + 400;
    		            date = new Date(Date.UTC.apply(null, args));
    		            if (isFinite(date.getUTCFullYear())) {
    		                date.setUTCFullYear(y);
    		            }
    		        } else {
    		            date = new Date(Date.UTC.apply(null, arguments));
    		        }

    		        return date;
    		    }

    		    // start-of-first-week - start-of-year
    		    function firstWeekOffset(year, dow, doy) {
    		        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
    		            fwd = 7 + dow - doy,
    		            // first-week day local weekday -- which local weekday is fwd
    		            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

    		        return -fwdlw + fwd - 1;
    		    }

    		    // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    		    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
    		        var localWeekday = (7 + weekday - dow) % 7,
    		            weekOffset = firstWeekOffset(year, dow, doy),
    		            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
    		            resYear,
    		            resDayOfYear;

    		        if (dayOfYear <= 0) {
    		            resYear = year - 1;
    		            resDayOfYear = daysInYear(resYear) + dayOfYear;
    		        } else if (dayOfYear > daysInYear(year)) {
    		            resYear = year + 1;
    		            resDayOfYear = dayOfYear - daysInYear(year);
    		        } else {
    		            resYear = year;
    		            resDayOfYear = dayOfYear;
    		        }

    		        return {
    		            year: resYear,
    		            dayOfYear: resDayOfYear,
    		        };
    		    }

    		    function weekOfYear(mom, dow, doy) {
    		        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
    		            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
    		            resWeek,
    		            resYear;

    		        if (week < 1) {
    		            resYear = mom.year() - 1;
    		            resWeek = week + weeksInYear(resYear, dow, doy);
    		        } else if (week > weeksInYear(mom.year(), dow, doy)) {
    		            resWeek = week - weeksInYear(mom.year(), dow, doy);
    		            resYear = mom.year() + 1;
    		        } else {
    		            resYear = mom.year();
    		            resWeek = week;
    		        }

    		        return {
    		            week: resWeek,
    		            year: resYear,
    		        };
    		    }

    		    function weeksInYear(year, dow, doy) {
    		        var weekOffset = firstWeekOffset(year, dow, doy),
    		            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
    		        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    		    }

    		    // FORMATTING

    		    addFormatToken('w', ['ww', 2], 'wo', 'week');
    		    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    		    // PARSING

    		    addRegexToken('w', match1to2, match1to2NoLeadingZero);
    		    addRegexToken('ww', match1to2, match2);
    		    addRegexToken('W', match1to2, match1to2NoLeadingZero);
    		    addRegexToken('WW', match1to2, match2);

    		    addWeekParseToken(
    		        ['w', 'ww', 'W', 'WW'],
    		        function (input, week, config, token) {
    		            week[token.substr(0, 1)] = toInt(input);
    		        }
    		    );

    		    // HELPERS

    		    // LOCALES

    		    function localeWeek(mom) {
    		        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    		    }

    		    var defaultLocaleWeek = {
    		        dow: 0, // Sunday is the first day of the week.
    		        doy: 6, // The week that contains Jan 6th is the first week of the year.
    		    };

    		    function localeFirstDayOfWeek() {
    		        return this._week.dow;
    		    }

    		    function localeFirstDayOfYear() {
    		        return this._week.doy;
    		    }

    		    // MOMENTS

    		    function getSetWeek(input) {
    		        var week = this.localeData().week(this);
    		        return input == null ? week : this.add((input - week) * 7, 'd');
    		    }

    		    function getSetISOWeek(input) {
    		        var week = weekOfYear(this, 1, 4).week;
    		        return input == null ? week : this.add((input - week) * 7, 'd');
    		    }

    		    // FORMATTING

    		    addFormatToken('d', 0, 'do', 'day');

    		    addFormatToken('dd', 0, 0, function (format) {
    		        return this.localeData().weekdaysMin(this, format);
    		    });

    		    addFormatToken('ddd', 0, 0, function (format) {
    		        return this.localeData().weekdaysShort(this, format);
    		    });

    		    addFormatToken('dddd', 0, 0, function (format) {
    		        return this.localeData().weekdays(this, format);
    		    });

    		    addFormatToken('e', 0, 0, 'weekday');
    		    addFormatToken('E', 0, 0, 'isoWeekday');

    		    // PARSING

    		    addRegexToken('d', match1to2);
    		    addRegexToken('e', match1to2);
    		    addRegexToken('E', match1to2);
    		    addRegexToken('dd', function (isStrict, locale) {
    		        return locale.weekdaysMinRegex(isStrict);
    		    });
    		    addRegexToken('ddd', function (isStrict, locale) {
    		        return locale.weekdaysShortRegex(isStrict);
    		    });
    		    addRegexToken('dddd', function (isStrict, locale) {
    		        return locale.weekdaysRegex(isStrict);
    		    });

    		    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
    		        var weekday = config._locale.weekdaysParse(input, token, config._strict);
    		        // if we didn't get a weekday name, mark the date as invalid
    		        if (weekday != null) {
    		            week.d = weekday;
    		        } else {
    		            getParsingFlags(config).invalidWeekday = input;
    		        }
    		    });

    		    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
    		        week[token] = toInt(input);
    		    });

    		    // HELPERS

    		    function parseWeekday(input, locale) {
    		        if (typeof input !== 'string') {
    		            return input;
    		        }

    		        if (!isNaN(input)) {
    		            return parseInt(input, 10);
    		        }

    		        input = locale.weekdaysParse(input);
    		        if (typeof input === 'number') {
    		            return input;
    		        }

    		        return null;
    		    }

    		    function parseIsoWeekday(input, locale) {
    		        if (typeof input === 'string') {
    		            return locale.weekdaysParse(input) % 7 || 7;
    		        }
    		        return isNaN(input) ? null : input;
    		    }

    		    // LOCALES
    		    function shiftWeekdays(ws, n) {
    		        return ws.slice(n, 7).concat(ws.slice(0, n));
    		    }

    		    var defaultLocaleWeekdays =
    		            'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
    		        defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
    		        defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
    		        defaultWeekdaysRegex = matchWord,
    		        defaultWeekdaysShortRegex = matchWord,
    		        defaultWeekdaysMinRegex = matchWord;

    		    function localeWeekdays(m, format) {
    		        var weekdays = isArray(this._weekdays)
    		            ? this._weekdays
    		            : this._weekdays[
    		                  m && m !== true && this._weekdays.isFormat.test(format)
    		                      ? 'format'
    		                      : 'standalone'
    		              ];
    		        return m === true
    		            ? shiftWeekdays(weekdays, this._week.dow)
    		            : m
    		              ? weekdays[m.day()]
    		              : weekdays;
    		    }

    		    function localeWeekdaysShort(m) {
    		        return m === true
    		            ? shiftWeekdays(this._weekdaysShort, this._week.dow)
    		            : m
    		              ? this._weekdaysShort[m.day()]
    		              : this._weekdaysShort;
    		    }

    		    function localeWeekdaysMin(m) {
    		        return m === true
    		            ? shiftWeekdays(this._weekdaysMin, this._week.dow)
    		            : m
    		              ? this._weekdaysMin[m.day()]
    		              : this._weekdaysMin;
    		    }

    		    function handleStrictParse$1(weekdayName, format, strict) {
    		        var i,
    		            ii,
    		            mom,
    		            llc = weekdayName.toLocaleLowerCase();
    		        if (!this._weekdaysParse) {
    		            this._weekdaysParse = [];
    		            this._shortWeekdaysParse = [];
    		            this._minWeekdaysParse = [];

    		            for (i = 0; i < 7; ++i) {
    		                mom = createUTC([2000, 1]).day(i);
    		                this._minWeekdaysParse[i] = this.weekdaysMin(
    		                    mom,
    		                    ''
    		                ).toLocaleLowerCase();
    		                this._shortWeekdaysParse[i] = this.weekdaysShort(
    		                    mom,
    		                    ''
    		                ).toLocaleLowerCase();
    		                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
    		            }
    		        }

    		        if (strict) {
    		            if (format === 'dddd') {
    		                ii = indexOf.call(this._weekdaysParse, llc);
    		                return ii !== -1 ? ii : null;
    		            } else if (format === 'ddd') {
    		                ii = indexOf.call(this._shortWeekdaysParse, llc);
    		                return ii !== -1 ? ii : null;
    		            } else {
    		                ii = indexOf.call(this._minWeekdaysParse, llc);
    		                return ii !== -1 ? ii : null;
    		            }
    		        } else {
    		            if (format === 'dddd') {
    		                ii = indexOf.call(this._weekdaysParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._shortWeekdaysParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._minWeekdaysParse, llc);
    		                return ii !== -1 ? ii : null;
    		            } else if (format === 'ddd') {
    		                ii = indexOf.call(this._shortWeekdaysParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._weekdaysParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._minWeekdaysParse, llc);
    		                return ii !== -1 ? ii : null;
    		            } else {
    		                ii = indexOf.call(this._minWeekdaysParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._weekdaysParse, llc);
    		                if (ii !== -1) {
    		                    return ii;
    		                }
    		                ii = indexOf.call(this._shortWeekdaysParse, llc);
    		                return ii !== -1 ? ii : null;
    		            }
    		        }
    		    }

    		    function localeWeekdaysParse(weekdayName, format, strict) {
    		        var i, mom, regex;

    		        if (this._weekdaysParseExact) {
    		            return handleStrictParse$1.call(this, weekdayName, format, strict);
    		        }

    		        if (!this._weekdaysParse) {
    		            this._weekdaysParse = [];
    		            this._minWeekdaysParse = [];
    		            this._shortWeekdaysParse = [];
    		            this._fullWeekdaysParse = [];
    		        }

    		        for (i = 0; i < 7; i++) {
    		            // make the regex if we don't have it already

    		            mom = createUTC([2000, 1]).day(i);
    		            if (strict && !this._fullWeekdaysParse[i]) {
    		                this._fullWeekdaysParse[i] = new RegExp(
    		                    '^' + this.weekdays(mom, '').replace('.', '\\.?') + '$',
    		                    'i'
    		                );
    		                this._shortWeekdaysParse[i] = new RegExp(
    		                    '^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$',
    		                    'i'
    		                );
    		                this._minWeekdaysParse[i] = new RegExp(
    		                    '^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$',
    		                    'i'
    		                );
    		            }
    		            if (!this._weekdaysParse[i]) {
    		                regex =
    		                    '^' +
    		                    this.weekdays(mom, '') +
    		                    '|^' +
    		                    this.weekdaysShort(mom, '') +
    		                    '|^' +
    		                    this.weekdaysMin(mom, '');
    		                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
    		            }
    		            // test the regex
    		            if (
    		                strict &&
    		                format === 'dddd' &&
    		                this._fullWeekdaysParse[i].test(weekdayName)
    		            ) {
    		                return i;
    		            } else if (
    		                strict &&
    		                format === 'ddd' &&
    		                this._shortWeekdaysParse[i].test(weekdayName)
    		            ) {
    		                return i;
    		            } else if (
    		                strict &&
    		                format === 'dd' &&
    		                this._minWeekdaysParse[i].test(weekdayName)
    		            ) {
    		                return i;
    		            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
    		                return i;
    		            }
    		        }
    		    }

    		    // MOMENTS

    		    function getSetDayOfWeek(input) {
    		        if (!this.isValid()) {
    		            return input != null ? this : NaN;
    		        }

    		        var day = get(this, 'Day');
    		        if (input != null) {
    		            input = parseWeekday(input, this.localeData());
    		            return this.add(input - day, 'd');
    		        } else {
    		            return day;
    		        }
    		    }

    		    function getSetLocaleDayOfWeek(input) {
    		        if (!this.isValid()) {
    		            return input != null ? this : NaN;
    		        }
    		        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
    		        return input == null ? weekday : this.add(input - weekday, 'd');
    		    }

    		    function getSetISODayOfWeek(input) {
    		        if (!this.isValid()) {
    		            return input != null ? this : NaN;
    		        }

    		        // behaves the same as moment#day except
    		        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
    		        // as a setter, sunday should belong to the previous week.

    		        if (input != null) {
    		            var weekday = parseIsoWeekday(input, this.localeData());
    		            return this.day(this.day() % 7 ? weekday : weekday - 7);
    		        } else {
    		            return this.day() || 7;
    		        }
    		    }

    		    function weekdaysRegex(isStrict) {
    		        if (this._weekdaysParseExact) {
    		            if (!hasOwnProp(this, '_weekdaysRegex')) {
    		                computeWeekdaysParse.call(this);
    		            }
    		            if (isStrict) {
    		                return this._weekdaysStrictRegex;
    		            } else {
    		                return this._weekdaysRegex;
    		            }
    		        } else {
    		            if (!hasOwnProp(this, '_weekdaysRegex')) {
    		                this._weekdaysRegex = defaultWeekdaysRegex;
    		            }
    		            return this._weekdaysStrictRegex && isStrict
    		                ? this._weekdaysStrictRegex
    		                : this._weekdaysRegex;
    		        }
    		    }

    		    function weekdaysShortRegex(isStrict) {
    		        if (this._weekdaysParseExact) {
    		            if (!hasOwnProp(this, '_weekdaysRegex')) {
    		                computeWeekdaysParse.call(this);
    		            }
    		            if (isStrict) {
    		                return this._weekdaysShortStrictRegex;
    		            } else {
    		                return this._weekdaysShortRegex;
    		            }
    		        } else {
    		            if (!hasOwnProp(this, '_weekdaysShortRegex')) {
    		                this._weekdaysShortRegex = defaultWeekdaysShortRegex;
    		            }
    		            return this._weekdaysShortStrictRegex && isStrict
    		                ? this._weekdaysShortStrictRegex
    		                : this._weekdaysShortRegex;
    		        }
    		    }

    		    function weekdaysMinRegex(isStrict) {
    		        if (this._weekdaysParseExact) {
    		            if (!hasOwnProp(this, '_weekdaysRegex')) {
    		                computeWeekdaysParse.call(this);
    		            }
    		            if (isStrict) {
    		                return this._weekdaysMinStrictRegex;
    		            } else {
    		                return this._weekdaysMinRegex;
    		            }
    		        } else {
    		            if (!hasOwnProp(this, '_weekdaysMinRegex')) {
    		                this._weekdaysMinRegex = defaultWeekdaysMinRegex;
    		            }
    		            return this._weekdaysMinStrictRegex && isStrict
    		                ? this._weekdaysMinStrictRegex
    		                : this._weekdaysMinRegex;
    		        }
    		    }

    		    function computeWeekdaysParse() {
    		        function cmpLenRev(a, b) {
    		            return b.length - a.length;
    		        }

    		        var minPieces = [],
    		            shortPieces = [],
    		            longPieces = [],
    		            mixedPieces = [],
    		            i,
    		            mom,
    		            minp,
    		            shortp,
    		            longp;
    		        for (i = 0; i < 7; i++) {
    		            // make the regex if we don't have it already
    		            mom = createUTC([2000, 1]).day(i);
    		            minp = regexEscape(this.weekdaysMin(mom, ''));
    		            shortp = regexEscape(this.weekdaysShort(mom, ''));
    		            longp = regexEscape(this.weekdays(mom, ''));
    		            minPieces.push(minp);
    		            shortPieces.push(shortp);
    		            longPieces.push(longp);
    		            mixedPieces.push(minp);
    		            mixedPieces.push(shortp);
    		            mixedPieces.push(longp);
    		        }
    		        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
    		        // will match the longer piece.
    		        minPieces.sort(cmpLenRev);
    		        shortPieces.sort(cmpLenRev);
    		        longPieces.sort(cmpLenRev);
    		        mixedPieces.sort(cmpLenRev);

    		        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    		        this._weekdaysShortRegex = this._weekdaysRegex;
    		        this._weekdaysMinRegex = this._weekdaysRegex;

    		        this._weekdaysStrictRegex = new RegExp(
    		            '^(' + longPieces.join('|') + ')',
    		            'i'
    		        );
    		        this._weekdaysShortStrictRegex = new RegExp(
    		            '^(' + shortPieces.join('|') + ')',
    		            'i'
    		        );
    		        this._weekdaysMinStrictRegex = new RegExp(
    		            '^(' + minPieces.join('|') + ')',
    		            'i'
    		        );
    		    }

    		    // FORMATTING

    		    function hFormat() {
    		        return this.hours() % 12 || 12;
    		    }

    		    function kFormat() {
    		        return this.hours() || 24;
    		    }

    		    addFormatToken('H', ['HH', 2], 0, 'hour');
    		    addFormatToken('h', ['hh', 2], 0, hFormat);
    		    addFormatToken('k', ['kk', 2], 0, kFormat);

    		    addFormatToken('hmm', 0, 0, function () {
    		        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    		    });

    		    addFormatToken('hmmss', 0, 0, function () {
    		        return (
    		            '' +
    		            hFormat.apply(this) +
    		            zeroFill(this.minutes(), 2) +
    		            zeroFill(this.seconds(), 2)
    		        );
    		    });

    		    addFormatToken('Hmm', 0, 0, function () {
    		        return '' + this.hours() + zeroFill(this.minutes(), 2);
    		    });

    		    addFormatToken('Hmmss', 0, 0, function () {
    		        return (
    		            '' +
    		            this.hours() +
    		            zeroFill(this.minutes(), 2) +
    		            zeroFill(this.seconds(), 2)
    		        );
    		    });

    		    function meridiem(token, lowercase) {
    		        addFormatToken(token, 0, 0, function () {
    		            return this.localeData().meridiem(
    		                this.hours(),
    		                this.minutes(),
    		                lowercase
    		            );
    		        });
    		    }

    		    meridiem('a', true);
    		    meridiem('A', false);

    		    // PARSING

    		    function matchMeridiem(isStrict, locale) {
    		        return locale._meridiemParse;
    		    }

    		    addRegexToken('a', matchMeridiem);
    		    addRegexToken('A', matchMeridiem);
    		    addRegexToken('H', match1to2, match1to2HasZero);
    		    addRegexToken('h', match1to2, match1to2NoLeadingZero);
    		    addRegexToken('k', match1to2, match1to2NoLeadingZero);
    		    addRegexToken('HH', match1to2, match2);
    		    addRegexToken('hh', match1to2, match2);
    		    addRegexToken('kk', match1to2, match2);

    		    addRegexToken('hmm', match3to4);
    		    addRegexToken('hmmss', match5to6);
    		    addRegexToken('Hmm', match3to4);
    		    addRegexToken('Hmmss', match5to6);

    		    addParseToken(['H', 'HH'], HOUR);
    		    addParseToken(['k', 'kk'], function (input, array, config) {
    		        var kInput = toInt(input);
    		        array[HOUR] = kInput === 24 ? 0 : kInput;
    		    });
    		    addParseToken(['a', 'A'], function (input, array, config) {
    		        config._isPm = config._locale.isPM(input);
    		        config._meridiem = input;
    		    });
    		    addParseToken(['h', 'hh'], function (input, array, config) {
    		        array[HOUR] = toInt(input);
    		        getParsingFlags(config).bigHour = true;
    		    });
    		    addParseToken('hmm', function (input, array, config) {
    		        var pos = input.length - 2;
    		        array[HOUR] = toInt(input.substr(0, pos));
    		        array[MINUTE] = toInt(input.substr(pos));
    		        getParsingFlags(config).bigHour = true;
    		    });
    		    addParseToken('hmmss', function (input, array, config) {
    		        var pos1 = input.length - 4,
    		            pos2 = input.length - 2;
    		        array[HOUR] = toInt(input.substr(0, pos1));
    		        array[MINUTE] = toInt(input.substr(pos1, 2));
    		        array[SECOND] = toInt(input.substr(pos2));
    		        getParsingFlags(config).bigHour = true;
    		    });
    		    addParseToken('Hmm', function (input, array, config) {
    		        var pos = input.length - 2;
    		        array[HOUR] = toInt(input.substr(0, pos));
    		        array[MINUTE] = toInt(input.substr(pos));
    		    });
    		    addParseToken('Hmmss', function (input, array, config) {
    		        var pos1 = input.length - 4,
    		            pos2 = input.length - 2;
    		        array[HOUR] = toInt(input.substr(0, pos1));
    		        array[MINUTE] = toInt(input.substr(pos1, 2));
    		        array[SECOND] = toInt(input.substr(pos2));
    		    });

    		    // LOCALES

    		    function localeIsPM(input) {
    		        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
    		        // Using charAt should be more compatible.
    		        return (input + '').toLowerCase().charAt(0) === 'p';
    		    }

    		    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i,
    		        // Setting the hour should keep the time, because the user explicitly
    		        // specified which hour they want. So trying to maintain the same hour (in
    		        // a new timezone) makes sense. Adding/subtracting hours does not follow
    		        // this rule.
    		        getSetHour = makeGetSet('Hours', true);

    		    function localeMeridiem(hours, minutes, isLower) {
    		        if (hours > 11) {
    		            return isLower ? 'pm' : 'PM';
    		        } else {
    		            return isLower ? 'am' : 'AM';
    		        }
    		    }

    		    var baseConfig = {
    		        calendar: defaultCalendar,
    		        longDateFormat: defaultLongDateFormat,
    		        invalidDate: defaultInvalidDate,
    		        ordinal: defaultOrdinal,
    		        dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
    		        relativeTime: defaultRelativeTime,

    		        months: defaultLocaleMonths,
    		        monthsShort: defaultLocaleMonthsShort,

    		        week: defaultLocaleWeek,

    		        weekdays: defaultLocaleWeekdays,
    		        weekdaysMin: defaultLocaleWeekdaysMin,
    		        weekdaysShort: defaultLocaleWeekdaysShort,

    		        meridiemParse: defaultLocaleMeridiemParse,
    		    };

    		    // internal storage for locale config files
    		    var locales = {},
    		        localeFamilies = {},
    		        globalLocale;

    		    function commonPrefix(arr1, arr2) {
    		        var i,
    		            minl = Math.min(arr1.length, arr2.length);
    		        for (i = 0; i < minl; i += 1) {
    		            if (arr1[i] !== arr2[i]) {
    		                return i;
    		            }
    		        }
    		        return minl;
    		    }

    		    function normalizeLocale(key) {
    		        return key ? key.toLowerCase().replace('_', '-') : key;
    		    }

    		    // pick the locale from the array
    		    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    		    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    		    function chooseLocale(names) {
    		        var i = 0,
    		            j,
    		            next,
    		            locale,
    		            split;

    		        while (i < names.length) {
    		            split = normalizeLocale(names[i]).split('-');
    		            j = split.length;
    		            next = normalizeLocale(names[i + 1]);
    		            next = next ? next.split('-') : null;
    		            while (j > 0) {
    		                locale = loadLocale(split.slice(0, j).join('-'));
    		                if (locale) {
    		                    return locale;
    		                }
    		                if (
    		                    next &&
    		                    next.length >= j &&
    		                    commonPrefix(split, next) >= j - 1
    		                ) {
    		                    //the next array item is better than a shallower substring of this one
    		                    break;
    		                }
    		                j--;
    		            }
    		            i++;
    		        }
    		        return globalLocale;
    		    }

    		    function isLocaleNameSane(name) {
    		        // Prevent names that look like filesystem paths, i.e contain '/' or '\'
    		        // Ensure name is available and function returns boolean
    		        return !!(name && name.match('^[^/\\\\]*$'));
    		    }

    		    function loadLocale(name) {
    		        var oldLocale = null,
    		            aliasedRequire;
    		        // TODO: Find a better way to register and load all the locales in Node
    		        if (
    		            locales[name] === undefined &&
    		            'object' !== 'undefined' &&
    		            module &&
    		            module.exports &&
    		            isLocaleNameSane(name)
    		        ) {
    		            try {
    		                oldLocale = globalLocale._abbr;
    		                aliasedRequire = commonjsRequire;
    		                aliasedRequire('./locale/' + name);
    		                getSetGlobalLocale(oldLocale);
    		            } catch (e) {
    		                // mark as not found to avoid repeating expensive file require call causing high CPU
    		                // when trying to find en-US, en_US, en-us for every format call
    		                locales[name] = null; // null means not found
    		            }
    		        }
    		        return locales[name];
    		    }

    		    // This function will load locale and then set the global locale.  If
    		    // no arguments are passed in, it will simply return the current global
    		    // locale key.
    		    function getSetGlobalLocale(key, values) {
    		        var data;
    		        if (key) {
    		            if (isUndefined(values)) {
    		                data = getLocale(key);
    		            } else {
    		                data = defineLocale(key, values);
    		            }

    		            if (data) {
    		                // moment.duration._locale = moment._locale = data;
    		                globalLocale = data;
    		            } else {
    		                if (typeof console !== 'undefined' && console.warn) {
    		                    //warn user if arguments are passed but the locale could not be set
    		                    console.warn(
    		                        'Locale ' + key + ' not found. Did you forget to load it?'
    		                    );
    		                }
    		            }
    		        }

    		        return globalLocale._abbr;
    		    }

    		    function defineLocale(name, config) {
    		        if (config !== null) {
    		            var locale,
    		                parentConfig = baseConfig;
    		            config.abbr = name;
    		            if (locales[name] != null) {
    		                deprecateSimple(
    		                    'defineLocaleOverride',
    		                    'use moment.updateLocale(localeName, config) to change ' +
    		                        'an existing locale. moment.defineLocale(localeName, ' +
    		                        'config) should only be used for creating a new locale ' +
    		                        'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.'
    		                );
    		                parentConfig = locales[name]._config;
    		            } else if (config.parentLocale != null) {
    		                if (locales[config.parentLocale] != null) {
    		                    parentConfig = locales[config.parentLocale]._config;
    		                } else {
    		                    locale = loadLocale(config.parentLocale);
    		                    if (locale != null) {
    		                        parentConfig = locale._config;
    		                    } else {
    		                        if (!localeFamilies[config.parentLocale]) {
    		                            localeFamilies[config.parentLocale] = [];
    		                        }
    		                        localeFamilies[config.parentLocale].push({
    		                            name: name,
    		                            config: config,
    		                        });
    		                        return null;
    		                    }
    		                }
    		            }
    		            locales[name] = new Locale(mergeConfigs(parentConfig, config));

    		            if (localeFamilies[name]) {
    		                localeFamilies[name].forEach(function (x) {
    		                    defineLocale(x.name, x.config);
    		                });
    		            }

    		            // backwards compat for now: also set the locale
    		            // make sure we set the locale AFTER all child locales have been
    		            // created, so we won't end up with the child locale set.
    		            getSetGlobalLocale(name);

    		            return locales[name];
    		        } else {
    		            // useful for testing
    		            delete locales[name];
    		            return null;
    		        }
    		    }

    		    function updateLocale(name, config) {
    		        if (config != null) {
    		            var locale,
    		                tmpLocale,
    		                parentConfig = baseConfig;

    		            if (locales[name] != null && locales[name].parentLocale != null) {
    		                // Update existing child locale in-place to avoid memory-leaks
    		                locales[name].set(mergeConfigs(locales[name]._config, config));
    		            } else {
    		                // MERGE
    		                tmpLocale = loadLocale(name);
    		                if (tmpLocale != null) {
    		                    parentConfig = tmpLocale._config;
    		                }
    		                config = mergeConfigs(parentConfig, config);
    		                if (tmpLocale == null) {
    		                    // updateLocale is called for creating a new locale
    		                    // Set abbr so it will have a name (getters return
    		                    // undefined otherwise).
    		                    config.abbr = name;
    		                }
    		                locale = new Locale(config);
    		                locale.parentLocale = locales[name];
    		                locales[name] = locale;
    		            }

    		            // backwards compat for now: also set the locale
    		            getSetGlobalLocale(name);
    		        } else {
    		            // pass null for config to unupdate, useful for tests
    		            if (locales[name] != null) {
    		                if (locales[name].parentLocale != null) {
    		                    locales[name] = locales[name].parentLocale;
    		                    if (name === getSetGlobalLocale()) {
    		                        getSetGlobalLocale(name);
    		                    }
    		                } else if (locales[name] != null) {
    		                    delete locales[name];
    		                }
    		            }
    		        }
    		        return locales[name];
    		    }

    		    // returns locale data
    		    function getLocale(key) {
    		        var locale;

    		        if (key && key._locale && key._locale._abbr) {
    		            key = key._locale._abbr;
    		        }

    		        if (!key) {
    		            return globalLocale;
    		        }

    		        if (!isArray(key)) {
    		            //short-circuit everything else
    		            locale = loadLocale(key);
    		            if (locale) {
    		                return locale;
    		            }
    		            key = [key];
    		        }

    		        return chooseLocale(key);
    		    }

    		    function listLocales() {
    		        return keys(locales);
    		    }

    		    function checkOverflow(m) {
    		        var overflow,
    		            a = m._a;

    		        if (a && getParsingFlags(m).overflow === -2) {
    		            overflow =
    		                a[MONTH] < 0 || a[MONTH] > 11
    		                    ? MONTH
    		                    : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH])
    		                      ? DATE
    		                      : a[HOUR] < 0 ||
    		                          a[HOUR] > 24 ||
    		                          (a[HOUR] === 24 &&
    		                              (a[MINUTE] !== 0 ||
    		                                  a[SECOND] !== 0 ||
    		                                  a[MILLISECOND] !== 0))
    		                        ? HOUR
    		                        : a[MINUTE] < 0 || a[MINUTE] > 59
    		                          ? MINUTE
    		                          : a[SECOND] < 0 || a[SECOND] > 59
    		                            ? SECOND
    		                            : a[MILLISECOND] < 0 || a[MILLISECOND] > 999
    		                              ? MILLISECOND
    		                              : -1;

    		            if (
    		                getParsingFlags(m)._overflowDayOfYear &&
    		                (overflow < YEAR || overflow > DATE)
    		            ) {
    		                overflow = DATE;
    		            }
    		            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
    		                overflow = WEEK;
    		            }
    		            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
    		                overflow = WEEKDAY;
    		            }

    		            getParsingFlags(m).overflow = overflow;
    		        }

    		        return m;
    		    }

    		    // iso 8601 regex
    		    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    		    var extendedIsoRegex =
    		            /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
    		        basicIsoRegex =
    		            /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
    		        tzRegex = /Z|[+-]\d\d(?::?\d\d)?/,
    		        isoDates = [
    		            ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
    		            ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
    		            ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
    		            ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
    		            ['YYYY-DDD', /\d{4}-\d{3}/],
    		            ['YYYY-MM', /\d{4}-\d\d/, false],
    		            ['YYYYYYMMDD', /[+-]\d{10}/],
    		            ['YYYYMMDD', /\d{8}/],
    		            ['GGGG[W]WWE', /\d{4}W\d{3}/],
    		            ['GGGG[W]WW', /\d{4}W\d{2}/, false],
    		            ['YYYYDDD', /\d{7}/],
    		            ['YYYYMM', /\d{6}/, false],
    		            ['YYYY', /\d{4}/, false],
    		        ],
    		        // iso time formats and regexes
    		        isoTimes = [
    		            ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
    		            ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
    		            ['HH:mm:ss', /\d\d:\d\d:\d\d/],
    		            ['HH:mm', /\d\d:\d\d/],
    		            ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
    		            ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
    		            ['HHmmss', /\d\d\d\d\d\d/],
    		            ['HHmm', /\d\d\d\d/],
    		            ['HH', /\d\d/],
    		        ],
    		        aspNetJsonRegex = /^\/?Date\((-?\d+)/i,
    		        // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
    		        rfc2822 =
    		            /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/,
    		        obsOffsets = {
    		            UT: 0,
    		            GMT: 0,
    		            EDT: -4 * 60,
    		            EST: -5 * 60,
    		            CDT: -5 * 60,
    		            CST: -6 * 60,
    		            MDT: -6 * 60,
    		            MST: -7 * 60,
    		            PDT: -7 * 60,
    		            PST: -8 * 60,
    		        };

    		    // date from iso format
    		    function configFromISO(config) {
    		        var i,
    		            l,
    		            string = config._i,
    		            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
    		            allowTime,
    		            dateFormat,
    		            timeFormat,
    		            tzFormat,
    		            isoDatesLen = isoDates.length,
    		            isoTimesLen = isoTimes.length;

    		        if (match) {
    		            getParsingFlags(config).iso = true;
    		            for (i = 0, l = isoDatesLen; i < l; i++) {
    		                if (isoDates[i][1].exec(match[1])) {
    		                    dateFormat = isoDates[i][0];
    		                    allowTime = isoDates[i][2] !== false;
    		                    break;
    		                }
    		            }
    		            if (dateFormat == null) {
    		                config._isValid = false;
    		                return;
    		            }
    		            if (match[3]) {
    		                for (i = 0, l = isoTimesLen; i < l; i++) {
    		                    if (isoTimes[i][1].exec(match[3])) {
    		                        // match[2] should be 'T' or space
    		                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
    		                        break;
    		                    }
    		                }
    		                if (timeFormat == null) {
    		                    config._isValid = false;
    		                    return;
    		                }
    		            }
    		            if (!allowTime && timeFormat != null) {
    		                config._isValid = false;
    		                return;
    		            }
    		            if (match[4]) {
    		                if (tzRegex.exec(match[4])) {
    		                    tzFormat = 'Z';
    		                } else {
    		                    config._isValid = false;
    		                    return;
    		                }
    		            }
    		            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
    		            configFromStringAndFormat(config);
    		        } else {
    		            config._isValid = false;
    		        }
    		    }

    		    function extractFromRFC2822Strings(
    		        yearStr,
    		        monthStr,
    		        dayStr,
    		        hourStr,
    		        minuteStr,
    		        secondStr
    		    ) {
    		        var result = [
    		            untruncateYear(yearStr),
    		            defaultLocaleMonthsShort.indexOf(monthStr),
    		            parseInt(dayStr, 10),
    		            parseInt(hourStr, 10),
    		            parseInt(minuteStr, 10),
    		        ];

    		        if (secondStr) {
    		            result.push(parseInt(secondStr, 10));
    		        }

    		        return result;
    		    }

    		    function untruncateYear(yearStr) {
    		        var year = parseInt(yearStr, 10);
    		        if (year <= 49) {
    		            return 2000 + year;
    		        } else if (year <= 999) {
    		            return 1900 + year;
    		        }
    		        return year;
    		    }

    		    function preprocessRFC2822(s) {
    		        // Remove comments and folding whitespace and replace multiple-spaces with a single space
    		        return s
    		            .replace(/\([^()]*\)|[\n\t]/g, ' ')
    		            .replace(/(\s\s+)/g, ' ')
    		            .replace(/^\s\s*/, '')
    		            .replace(/\s\s*$/, '');
    		    }

    		    function checkWeekday(weekdayStr, parsedInput, config) {
    		        if (weekdayStr) {
    		            // TODO: Replace the vanilla JS Date object with an independent day-of-week check.
    		            var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
    		                weekdayActual = new Date(
    		                    parsedInput[0],
    		                    parsedInput[1],
    		                    parsedInput[2]
    		                ).getDay();
    		            if (weekdayProvided !== weekdayActual) {
    		                getParsingFlags(config).weekdayMismatch = true;
    		                config._isValid = false;
    		                return false;
    		            }
    		        }
    		        return true;
    		    }

    		    function calculateOffset(obsOffset, militaryOffset, numOffset) {
    		        if (obsOffset) {
    		            return obsOffsets[obsOffset];
    		        } else if (militaryOffset) {
    		            // the only allowed military tz is Z
    		            return 0;
    		        } else {
    		            var hm = parseInt(numOffset, 10),
    		                m = hm % 100,
    		                h = (hm - m) / 100;
    		            return h * 60 + m;
    		        }
    		    }

    		    // date and time from ref 2822 format
    		    function configFromRFC2822(config) {
    		        var match = rfc2822.exec(preprocessRFC2822(config._i)),
    		            parsedArray;
    		        if (match) {
    		            parsedArray = extractFromRFC2822Strings(
    		                match[4],
    		                match[3],
    		                match[2],
    		                match[5],
    		                match[6],
    		                match[7]
    		            );
    		            if (!checkWeekday(match[1], parsedArray, config)) {
    		                return;
    		            }

    		            config._a = parsedArray;
    		            config._tzm = calculateOffset(match[8], match[9], match[10]);

    		            config._d = createUTCDate.apply(null, config._a);
    		            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

    		            getParsingFlags(config).rfc2822 = true;
    		        } else {
    		            config._isValid = false;
    		        }
    		    }

    		    // date from 1) ASP.NET, 2) ISO, 3) RFC 2822 formats, or 4) optional fallback if parsing isn't strict
    		    function configFromString(config) {
    		        var matched = aspNetJsonRegex.exec(config._i);
    		        if (matched !== null) {
    		            config._d = new Date(+matched[1]);
    		            return;
    		        }

    		        configFromISO(config);
    		        if (config._isValid === false) {
    		            delete config._isValid;
    		        } else {
    		            return;
    		        }

    		        configFromRFC2822(config);
    		        if (config._isValid === false) {
    		            delete config._isValid;
    		        } else {
    		            return;
    		        }

    		        if (config._strict) {
    		            config._isValid = false;
    		        } else {
    		            // Final attempt, use Input Fallback
    		            hooks.createFromInputFallback(config);
    		        }
    		    }

    		    hooks.createFromInputFallback = deprecate(
    		        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
    		            'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
    		            'discouraged. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.',
    		        function (config) {
    		            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
    		        }
    		    );

    		    // Pick the first defined of two or three arguments.
    		    function defaults(a, b, c) {
    		        if (a != null) {
    		            return a;
    		        }
    		        if (b != null) {
    		            return b;
    		        }
    		        return c;
    		    }

    		    function currentDateArray(config) {
    		        // hooks is actually the exported moment object
    		        var nowValue = new Date(hooks.now());
    		        if (config._useUTC) {
    		            return [
    		                nowValue.getUTCFullYear(),
    		                nowValue.getUTCMonth(),
    		                nowValue.getUTCDate(),
    		            ];
    		        }
    		        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    		    }

    		    // convert an array to a date.
    		    // the array should mirror the parameters below
    		    // note: all values past the year are optional and will default to the lowest possible value.
    		    // [year, month, day , hour, minute, second, millisecond]
    		    function configFromArray(config) {
    		        var i,
    		            date,
    		            input = [],
    		            currentDate,
    		            expectedWeekday,
    		            yearToUse;

    		        if (config._d) {
    		            return;
    		        }

    		        currentDate = currentDateArray(config);

    		        //compute day of the year from weeks and weekdays
    		        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
    		            dayOfYearFromWeekInfo(config);
    		        }

    		        //if the day of the year is set, figure out what it is
    		        if (config._dayOfYear != null) {
    		            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

    		            if (
    		                config._dayOfYear > daysInYear(yearToUse) ||
    		                config._dayOfYear === 0
    		            ) {
    		                getParsingFlags(config)._overflowDayOfYear = true;
    		            }

    		            date = createUTCDate(yearToUse, 0, config._dayOfYear);
    		            config._a[MONTH] = date.getUTCMonth();
    		            config._a[DATE] = date.getUTCDate();
    		        }

    		        // Default to current date.
    		        // * if no year, month, day of month are given, default to today
    		        // * if day of month is given, default month and year
    		        // * if month is given, default only year
    		        // * if year is given, don't default anything
    		        for (i = 0; i < 3 && config._a[i] == null; ++i) {
    		            config._a[i] = input[i] = currentDate[i];
    		        }

    		        // Zero out whatever was not defaulted, including time
    		        for (; i < 7; i++) {
    		            config._a[i] = input[i] =
    		                config._a[i] == null ? (i === 2 ? 1 : 0) : config._a[i];
    		        }

    		        // Check for 24:00:00.000
    		        if (
    		            config._a[HOUR] === 24 &&
    		            config._a[MINUTE] === 0 &&
    		            config._a[SECOND] === 0 &&
    		            config._a[MILLISECOND] === 0
    		        ) {
    		            config._nextDay = true;
    		            config._a[HOUR] = 0;
    		        }

    		        config._d = (config._useUTC ? createUTCDate : createDate).apply(
    		            null,
    		            input
    		        );
    		        expectedWeekday = config._useUTC
    		            ? config._d.getUTCDay()
    		            : config._d.getDay();

    		        // Apply timezone offset from input. The actual utcOffset can be changed
    		        // with parseZone.
    		        if (config._tzm != null) {
    		            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
    		        }

    		        if (config._nextDay) {
    		            config._a[HOUR] = 24;
    		        }

    		        // check for mismatching day of week
    		        if (
    		            config._w &&
    		            typeof config._w.d !== 'undefined' &&
    		            config._w.d !== expectedWeekday
    		        ) {
    		            getParsingFlags(config).weekdayMismatch = true;
    		        }
    		    }

    		    function dayOfYearFromWeekInfo(config) {
    		        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow, curWeek;

    		        w = config._w;
    		        if (w.GG != null || w.W != null || w.E != null) {
    		            dow = 1;
    		            doy = 4;

    		            // TODO: We need to take the current isoWeekYear, but that depends on
    		            // how we interpret now (local, utc, fixed offset). So create
    		            // a now version of current config (take local/utc/offset flags, and
    		            // create now).
    		            weekYear = defaults(
    		                w.GG,
    		                config._a[YEAR],
    		                weekOfYear(createLocal(), 1, 4).year
    		            );
    		            week = defaults(w.W, 1);
    		            weekday = defaults(w.E, 1);
    		            if (weekday < 1 || weekday > 7) {
    		                weekdayOverflow = true;
    		            }
    		        } else {
    		            dow = config._locale._week.dow;
    		            doy = config._locale._week.doy;

    		            curWeek = weekOfYear(createLocal(), dow, doy);

    		            weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

    		            // Default to current week.
    		            week = defaults(w.w, curWeek.week);

    		            if (w.d != null) {
    		                // weekday -- low day numbers are considered next week
    		                weekday = w.d;
    		                if (weekday < 0 || weekday > 6) {
    		                    weekdayOverflow = true;
    		                }
    		            } else if (w.e != null) {
    		                // local weekday -- counting starts from beginning of week
    		                weekday = w.e + dow;
    		                if (w.e < 0 || w.e > 6) {
    		                    weekdayOverflow = true;
    		                }
    		            } else {
    		                // default to beginning of week
    		                weekday = dow;
    		            }
    		        }
    		        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
    		            getParsingFlags(config)._overflowWeeks = true;
    		        } else if (weekdayOverflow != null) {
    		            getParsingFlags(config)._overflowWeekday = true;
    		        } else {
    		            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
    		            config._a[YEAR] = temp.year;
    		            config._dayOfYear = temp.dayOfYear;
    		        }
    		    }

    		    // constant that refers to the ISO standard
    		    hooks.ISO_8601 = function () {};

    		    // constant that refers to the RFC 2822 form
    		    hooks.RFC_2822 = function () {};

    		    // date from string and format string
    		    function configFromStringAndFormat(config) {
    		        // TODO: Move this to another part of the creation flow to prevent circular deps
    		        if (config._f === hooks.ISO_8601) {
    		            configFromISO(config);
    		            return;
    		        }
    		        if (config._f === hooks.RFC_2822) {
    		            configFromRFC2822(config);
    		            return;
    		        }
    		        config._a = [];
    		        getParsingFlags(config).empty = true;

    		        // This array is used to make a Date, either with `new Date` or `Date.UTC`
    		        var string = '' + config._i,
    		            i,
    		            parsedInput,
    		            tokens,
    		            token,
    		            skipped,
    		            stringLength = string.length,
    		            totalParsedInputLength = 0,
    		            era,
    		            tokenLen;

    		        tokens =
    		            expandFormat(config._f, config._locale).match(formattingTokens) || [];
    		        tokenLen = tokens.length;
    		        for (i = 0; i < tokenLen; i++) {
    		            token = tokens[i];
    		            parsedInput = (string.match(getParseRegexForToken(token, config)) ||
    		                [])[0];
    		            if (parsedInput) {
    		                skipped = string.substr(0, string.indexOf(parsedInput));
    		                if (skipped.length > 0) {
    		                    getParsingFlags(config).unusedInput.push(skipped);
    		                }
    		                string = string.slice(
    		                    string.indexOf(parsedInput) + parsedInput.length
    		                );
    		                totalParsedInputLength += parsedInput.length;
    		            }
    		            // don't parse if it's not a known token
    		            if (formatTokenFunctions[token]) {
    		                if (parsedInput) {
    		                    getParsingFlags(config).empty = false;
    		                } else {
    		                    getParsingFlags(config).unusedTokens.push(token);
    		                }
    		                addTimeToArrayFromToken(token, parsedInput, config);
    		            } else if (config._strict && !parsedInput) {
    		                getParsingFlags(config).unusedTokens.push(token);
    		            }
    		        }

    		        // add remaining unparsed input length to the string
    		        getParsingFlags(config).charsLeftOver =
    		            stringLength - totalParsedInputLength;
    		        if (string.length > 0) {
    		            getParsingFlags(config).unusedInput.push(string);
    		        }

    		        // clear _12h flag if hour is <= 12
    		        if (
    		            config._a[HOUR] <= 12 &&
    		            getParsingFlags(config).bigHour === true &&
    		            config._a[HOUR] > 0
    		        ) {
    		            getParsingFlags(config).bigHour = undefined;
    		        }

    		        getParsingFlags(config).parsedDateParts = config._a.slice(0);
    		        getParsingFlags(config).meridiem = config._meridiem;
    		        // handle meridiem
    		        config._a[HOUR] = meridiemFixWrap(
    		            config._locale,
    		            config._a[HOUR],
    		            config._meridiem
    		        );

    		        // handle era
    		        era = getParsingFlags(config).era;
    		        if (era !== null) {
    		            config._a[YEAR] = config._locale.erasConvertYear(era, config._a[YEAR]);
    		        }

    		        configFromArray(config);
    		        checkOverflow(config);
    		    }

    		    function meridiemFixWrap(locale, hour, meridiem) {
    		        var isPm;

    		        if (meridiem == null) {
    		            // nothing to do
    		            return hour;
    		        }
    		        if (locale.meridiemHour != null) {
    		            return locale.meridiemHour(hour, meridiem);
    		        } else if (locale.isPM != null) {
    		            // Fallback
    		            isPm = locale.isPM(meridiem);
    		            if (isPm && hour < 12) {
    		                hour += 12;
    		            }
    		            if (!isPm && hour === 12) {
    		                hour = 0;
    		            }
    		            return hour;
    		        } else {
    		            // this is not supposed to happen
    		            return hour;
    		        }
    		    }

    		    // date from string and array of format strings
    		    function configFromStringAndArray(config) {
    		        var tempConfig,
    		            bestMoment,
    		            scoreToBeat,
    		            i,
    		            currentScore,
    		            validFormatFound,
    		            bestFormatIsValid = false,
    		            configfLen = config._f.length;

    		        if (configfLen === 0) {
    		            getParsingFlags(config).invalidFormat = true;
    		            config._d = new Date(NaN);
    		            return;
    		        }

    		        for (i = 0; i < configfLen; i++) {
    		            currentScore = 0;
    		            validFormatFound = false;
    		            tempConfig = copyConfig({}, config);
    		            if (config._useUTC != null) {
    		                tempConfig._useUTC = config._useUTC;
    		            }
    		            tempConfig._f = config._f[i];
    		            configFromStringAndFormat(tempConfig);

    		            if (isValid(tempConfig)) {
    		                validFormatFound = true;
    		            }

    		            // if there is any input that was not parsed add a penalty for that format
    		            currentScore += getParsingFlags(tempConfig).charsLeftOver;

    		            //or tokens
    		            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

    		            getParsingFlags(tempConfig).score = currentScore;

    		            if (!bestFormatIsValid) {
    		                if (
    		                    scoreToBeat == null ||
    		                    currentScore < scoreToBeat ||
    		                    validFormatFound
    		                ) {
    		                    scoreToBeat = currentScore;
    		                    bestMoment = tempConfig;
    		                    if (validFormatFound) {
    		                        bestFormatIsValid = true;
    		                    }
    		                }
    		            } else {
    		                if (currentScore < scoreToBeat) {
    		                    scoreToBeat = currentScore;
    		                    bestMoment = tempConfig;
    		                }
    		            }
    		        }

    		        extend(config, bestMoment || tempConfig);
    		    }

    		    function configFromObject(config) {
    		        if (config._d) {
    		            return;
    		        }

    		        var i = normalizeObjectUnits(config._i),
    		            dayOrDate = i.day === undefined ? i.date : i.day;
    		        config._a = map(
    		            [i.year, i.month, dayOrDate, i.hour, i.minute, i.second, i.millisecond],
    		            function (obj) {
    		                return obj && parseInt(obj, 10);
    		            }
    		        );

    		        configFromArray(config);
    		    }

    		    function createFromConfig(config) {
    		        var res = new Moment(checkOverflow(prepareConfig(config)));
    		        if (res._nextDay) {
    		            // Adding is smart enough around DST
    		            res.add(1, 'd');
    		            res._nextDay = undefined;
    		        }

    		        return res;
    		    }

    		    function prepareConfig(config) {
    		        var input = config._i,
    		            format = config._f;

    		        config._locale = config._locale || getLocale(config._l);

    		        if (input === null || (format === undefined && input === '')) {
    		            return createInvalid({ nullInput: true });
    		        }

    		        if (typeof input === 'string') {
    		            config._i = input = config._locale.preparse(input);
    		        }

    		        if (isMoment(input)) {
    		            return new Moment(checkOverflow(input));
    		        } else if (isDate(input)) {
    		            config._d = input;
    		        } else if (isArray(format)) {
    		            configFromStringAndArray(config);
    		        } else if (format) {
    		            configFromStringAndFormat(config);
    		        } else {
    		            configFromInput(config);
    		        }

    		        if (!isValid(config)) {
    		            config._d = null;
    		        }

    		        return config;
    		    }

    		    function configFromInput(config) {
    		        var input = config._i;
    		        if (isUndefined(input)) {
    		            config._d = new Date(hooks.now());
    		        } else if (isDate(input)) {
    		            config._d = new Date(input.valueOf());
    		        } else if (typeof input === 'string') {
    		            configFromString(config);
    		        } else if (isArray(input)) {
    		            config._a = map(input.slice(0), function (obj) {
    		                return parseInt(obj, 10);
    		            });
    		            configFromArray(config);
    		        } else if (isObject(input)) {
    		            configFromObject(config);
    		        } else if (isNumber(input)) {
    		            // from milliseconds
    		            config._d = new Date(input);
    		        } else {
    		            hooks.createFromInputFallback(config);
    		        }
    		    }

    		    function createLocalOrUTC(input, format, locale, strict, isUTC) {
    		        var c = {};

    		        if (format === true || format === false) {
    		            strict = format;
    		            format = undefined;
    		        }

    		        if (locale === true || locale === false) {
    		            strict = locale;
    		            locale = undefined;
    		        }

    		        if (
    		            (isObject(input) && isObjectEmpty(input)) ||
    		            (isArray(input) && input.length === 0)
    		        ) {
    		            input = undefined;
    		        }
    		        // object construction must be done this way.
    		        // https://github.com/moment/moment/issues/1423
    		        c._isAMomentObject = true;
    		        c._useUTC = c._isUTC = isUTC;
    		        c._l = locale;
    		        c._i = input;
    		        c._f = format;
    		        c._strict = strict;

    		        return createFromConfig(c);
    		    }

    		    function createLocal(input, format, locale, strict) {
    		        return createLocalOrUTC(input, format, locale, strict, false);
    		    }

    		    var prototypeMin = deprecate(
    		            'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
    		            function () {
    		                var other = createLocal.apply(null, arguments);
    		                if (this.isValid() && other.isValid()) {
    		                    return other < this ? this : other;
    		                } else {
    		                    return createInvalid();
    		                }
    		            }
    		        ),
    		        prototypeMax = deprecate(
    		            'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
    		            function () {
    		                var other = createLocal.apply(null, arguments);
    		                if (this.isValid() && other.isValid()) {
    		                    return other > this ? this : other;
    		                } else {
    		                    return createInvalid();
    		                }
    		            }
    		        );

    		    // Pick a moment m from moments so that m[fn](other) is true for all
    		    // other. This relies on the function fn to be transitive.
    		    //
    		    // moments should either be an array of moment objects or an array, whose
    		    // first element is an array of moment objects.
    		    function pickBy(fn, moments) {
    		        var res, i;
    		        if (moments.length === 1 && isArray(moments[0])) {
    		            moments = moments[0];
    		        }
    		        if (!moments.length) {
    		            return createLocal();
    		        }
    		        res = moments[0];
    		        for (i = 1; i < moments.length; ++i) {
    		            if (!moments[i].isValid() || moments[i][fn](res)) {
    		                res = moments[i];
    		            }
    		        }
    		        return res;
    		    }

    		    // TODO: Use [].sort instead?
    		    function min() {
    		        var args = [].slice.call(arguments, 0);

    		        return pickBy('isBefore', args);
    		    }

    		    function max() {
    		        var args = [].slice.call(arguments, 0);

    		        return pickBy('isAfter', args);
    		    }

    		    var now = function () {
    		        return Date.now ? Date.now() : +new Date();
    		    };

    		    var ordering = [
    		        'year',
    		        'quarter',
    		        'month',
    		        'week',
    		        'day',
    		        'hour',
    		        'minute',
    		        'second',
    		        'millisecond',
    		    ];

    		    function isDurationValid(m) {
    		        var key,
    		            unitHasDecimal = false,
    		            i,
    		            orderLen = ordering.length;
    		        for (key in m) {
    		            if (
    		                hasOwnProp(m, key) &&
    		                !(
    		                    indexOf.call(ordering, key) !== -1 &&
    		                    (m[key] == null || !isNaN(m[key]))
    		                )
    		            ) {
    		                return false;
    		            }
    		        }

    		        for (i = 0; i < orderLen; ++i) {
    		            if (m[ordering[i]]) {
    		                if (unitHasDecimal) {
    		                    return false; // only allow non-integers for smallest unit
    		                }
    		                if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
    		                    unitHasDecimal = true;
    		                }
    		            }
    		        }

    		        return true;
    		    }

    		    function isValid$1() {
    		        return this._isValid;
    		    }

    		    function createInvalid$1() {
    		        return createDuration(NaN);
    		    }

    		    function Duration(duration) {
    		        var normalizedInput = normalizeObjectUnits(duration),
    		            years = normalizedInput.year || 0,
    		            quarters = normalizedInput.quarter || 0,
    		            months = normalizedInput.month || 0,
    		            weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
    		            days = normalizedInput.day || 0,
    		            hours = normalizedInput.hour || 0,
    		            minutes = normalizedInput.minute || 0,
    		            seconds = normalizedInput.second || 0,
    		            milliseconds = normalizedInput.millisecond || 0;

    		        this._isValid = isDurationValid(normalizedInput);

    		        // representation for dateAddRemove
    		        this._milliseconds =
    		            +milliseconds +
    		            seconds * 1e3 + // 1000
    		            minutes * 6e4 + // 1000 * 60
    		            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
    		        // Because of dateAddRemove treats 24 hours as different from a
    		        // day when working around DST, we need to store them separately
    		        this._days = +days + weeks * 7;
    		        // It is impossible to translate months into days without knowing
    		        // which months you are are talking about, so we have to store
    		        // it separately.
    		        this._months = +months + quarters * 3 + years * 12;

    		        this._data = {};

    		        this._locale = getLocale();

    		        this._bubble();
    		    }

    		    function isDuration(obj) {
    		        return obj instanceof Duration;
    		    }

    		    function absRound(number) {
    		        if (number < 0) {
    		            return Math.round(-1 * number) * -1;
    		        } else {
    		            return Math.round(number);
    		        }
    		    }

    		    // compare two arrays, return the number of differences
    		    function compareArrays(array1, array2, dontConvert) {
    		        var len = Math.min(array1.length, array2.length),
    		            lengthDiff = Math.abs(array1.length - array2.length),
    		            diffs = 0,
    		            i;
    		        for (i = 0; i < len; i++) {
    		            if (
    		                (toInt(array1[i]) !== toInt(array2[i]))
    		            ) {
    		                diffs++;
    		            }
    		        }
    		        return diffs + lengthDiff;
    		    }

    		    // FORMATTING

    		    function offset(token, separator) {
    		        addFormatToken(token, 0, 0, function () {
    		            var offset = this.utcOffset(),
    		                sign = '+';
    		            if (offset < 0) {
    		                offset = -offset;
    		                sign = '-';
    		            }
    		            return (
    		                sign +
    		                zeroFill(~~(offset / 60), 2) +
    		                separator +
    		                zeroFill(~~offset % 60, 2)
    		            );
    		        });
    		    }

    		    offset('Z', ':');
    		    offset('ZZ', '');

    		    // PARSING

    		    addRegexToken('Z', matchShortOffset);
    		    addRegexToken('ZZ', matchShortOffset);
    		    addParseToken(['Z', 'ZZ'], function (input, array, config) {
    		        config._useUTC = true;
    		        config._tzm = offsetFromString(matchShortOffset, input);
    		    });

    		    // HELPERS

    		    // timezone chunker
    		    // '+10:00' > ['10',  '00']
    		    // '-1530'  > ['-15', '30']
    		    var chunkOffset = /([\+\-]|\d\d)/gi;

    		    function offsetFromString(matcher, string) {
    		        var matches = (string || '').match(matcher),
    		            chunk,
    		            parts,
    		            minutes;

    		        if (matches === null) {
    		            return null;
    		        }

    		        chunk = matches[matches.length - 1] || [];
    		        parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
    		        minutes = +(parts[1] * 60) + toInt(parts[2]);

    		        return minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
    		    }

    		    // Return a moment from input, that is local/utc/zone equivalent to model.
    		    function cloneWithOffset(input, model) {
    		        var res, diff;
    		        if (model._isUTC) {
    		            res = model.clone();
    		            diff =
    		                (isMoment(input) || isDate(input)
    		                    ? input.valueOf()
    		                    : createLocal(input).valueOf()) - res.valueOf();
    		            // Use low-level api, because this fn is low-level api.
    		            res._d.setTime(res._d.valueOf() + diff);
    		            hooks.updateOffset(res, false);
    		            return res;
    		        } else {
    		            return createLocal(input).local();
    		        }
    		    }

    		    function getDateOffset(m) {
    		        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
    		        // https://github.com/moment/moment/pull/1871
    		        return -Math.round(m._d.getTimezoneOffset());
    		    }

    		    // HOOKS

    		    // This function will be called whenever a moment is mutated.
    		    // It is intended to keep the offset in sync with the timezone.
    		    hooks.updateOffset = function () {};

    		    // MOMENTS

    		    // keepLocalTime = true means only change the timezone, without
    		    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    		    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    		    // +0200, so we adjust the time as needed, to be valid.
    		    //
    		    // Keeping the time actually adds/subtracts (one hour)
    		    // from the actual represented time. That is why we call updateOffset
    		    // a second time. In case it wants us to change the offset again
    		    // _changeInProgress == true case, then we have to adjust, because
    		    // there is no such time in the given timezone.
    		    function getSetOffset(input, keepLocalTime, keepMinutes) {
    		        var offset = this._offset || 0,
    		            localAdjust;
    		        if (!this.isValid()) {
    		            return input != null ? this : NaN;
    		        }
    		        if (input != null) {
    		            if (typeof input === 'string') {
    		                input = offsetFromString(matchShortOffset, input);
    		                if (input === null) {
    		                    return this;
    		                }
    		            } else if (Math.abs(input) < 16 && !keepMinutes) {
    		                input = input * 60;
    		            }
    		            if (!this._isUTC && keepLocalTime) {
    		                localAdjust = getDateOffset(this);
    		            }
    		            this._offset = input;
    		            this._isUTC = true;
    		            if (localAdjust != null) {
    		                this.add(localAdjust, 'm');
    		            }
    		            if (offset !== input) {
    		                if (!keepLocalTime || this._changeInProgress) {
    		                    addSubtract(
    		                        this,
    		                        createDuration(input - offset, 'm'),
    		                        1,
    		                        false
    		                    );
    		                } else if (!this._changeInProgress) {
    		                    this._changeInProgress = true;
    		                    hooks.updateOffset(this, true);
    		                    this._changeInProgress = null;
    		                }
    		            }
    		            return this;
    		        } else {
    		            return this._isUTC ? offset : getDateOffset(this);
    		        }
    		    }

    		    function getSetZone(input, keepLocalTime) {
    		        if (input != null) {
    		            if (typeof input !== 'string') {
    		                input = -input;
    		            }

    		            this.utcOffset(input, keepLocalTime);

    		            return this;
    		        } else {
    		            return -this.utcOffset();
    		        }
    		    }

    		    function setOffsetToUTC(keepLocalTime) {
    		        return this.utcOffset(0, keepLocalTime);
    		    }

    		    function setOffsetToLocal(keepLocalTime) {
    		        if (this._isUTC) {
    		            this.utcOffset(0, keepLocalTime);
    		            this._isUTC = false;

    		            if (keepLocalTime) {
    		                this.subtract(getDateOffset(this), 'm');
    		            }
    		        }
    		        return this;
    		    }

    		    function setOffsetToParsedOffset() {
    		        if (this._tzm != null) {
    		            this.utcOffset(this._tzm, false, true);
    		        } else if (typeof this._i === 'string') {
    		            var tZone = offsetFromString(matchOffset, this._i);
    		            if (tZone != null) {
    		                this.utcOffset(tZone);
    		            } else {
    		                this.utcOffset(0, true);
    		            }
    		        }
    		        return this;
    		    }

    		    function hasAlignedHourOffset(input) {
    		        if (!this.isValid()) {
    		            return false;
    		        }
    		        input = input ? createLocal(input).utcOffset() : 0;

    		        return (this.utcOffset() - input) % 60 === 0;
    		    }

    		    function isDaylightSavingTime() {
    		        return (
    		            this.utcOffset() > this.clone().month(0).utcOffset() ||
    		            this.utcOffset() > this.clone().month(5).utcOffset()
    		        );
    		    }

    		    function isDaylightSavingTimeShifted() {
    		        if (!isUndefined(this._isDSTShifted)) {
    		            return this._isDSTShifted;
    		        }

    		        var c = {},
    		            other;

    		        copyConfig(c, this);
    		        c = prepareConfig(c);

    		        if (c._a) {
    		            other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
    		            this._isDSTShifted =
    		                this.isValid() && compareArrays(c._a, other.toArray()) > 0;
    		        } else {
    		            this._isDSTShifted = false;
    		        }

    		        return this._isDSTShifted;
    		    }

    		    function isLocal() {
    		        return this.isValid() ? !this._isUTC : false;
    		    }

    		    function isUtcOffset() {
    		        return this.isValid() ? this._isUTC : false;
    		    }

    		    function isUtc() {
    		        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    		    }

    		    // ASP.NET json date format regex
    		    var aspNetRegex = /^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/,
    		        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    		        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    		        // and further modified to allow for strings containing both week and day
    		        isoRegex =
    		            /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

    		    function createDuration(input, key) {
    		        var duration = input,
    		            // matching against regexp is expensive, do it on demand
    		            match = null,
    		            sign,
    		            ret,
    		            diffRes;

    		        if (isDuration(input)) {
    		            duration = {
    		                ms: input._milliseconds,
    		                d: input._days,
    		                M: input._months,
    		            };
    		        } else if (isNumber(input) || !isNaN(+input)) {
    		            duration = {};
    		            if (key) {
    		                duration[key] = +input;
    		            } else {
    		                duration.milliseconds = +input;
    		            }
    		        } else if ((match = aspNetRegex.exec(input))) {
    		            sign = match[1] === '-' ? -1 : 1;
    		            duration = {
    		                y: 0,
    		                d: toInt(match[DATE]) * sign,
    		                h: toInt(match[HOUR]) * sign,
    		                m: toInt(match[MINUTE]) * sign,
    		                s: toInt(match[SECOND]) * sign,
    		                ms: toInt(absRound(match[MILLISECOND] * 1000)) * sign, // the millisecond decimal point is included in the match
    		            };
    		        } else if ((match = isoRegex.exec(input))) {
    		            sign = match[1] === '-' ? -1 : 1;
    		            duration = {
    		                y: parseIso(match[2], sign),
    		                M: parseIso(match[3], sign),
    		                w: parseIso(match[4], sign),
    		                d: parseIso(match[5], sign),
    		                h: parseIso(match[6], sign),
    		                m: parseIso(match[7], sign),
    		                s: parseIso(match[8], sign),
    		            };
    		        } else if (duration == null) {
    		            // checks for null or undefined
    		            duration = {};
    		        } else if (
    		            typeof duration === 'object' &&
    		            ('from' in duration || 'to' in duration)
    		        ) {
    		            diffRes = momentsDifference(
    		                createLocal(duration.from),
    		                createLocal(duration.to)
    		            );

    		            duration = {};
    		            duration.ms = diffRes.milliseconds;
    		            duration.M = diffRes.months;
    		        }

    		        ret = new Duration(duration);

    		        if (isDuration(input) && hasOwnProp(input, '_locale')) {
    		            ret._locale = input._locale;
    		        }

    		        if (isDuration(input) && hasOwnProp(input, '_isValid')) {
    		            ret._isValid = input._isValid;
    		        }

    		        return ret;
    		    }

    		    createDuration.fn = Duration.prototype;
    		    createDuration.invalid = createInvalid$1;

    		    function parseIso(inp, sign) {
    		        // We'd normally use ~~inp for this, but unfortunately it also
    		        // converts floats to ints.
    		        // inp may be undefined, so careful calling replace on it.
    		        var res = inp && parseFloat(inp.replace(',', '.'));
    		        // apply sign while we're at it
    		        return (isNaN(res) ? 0 : res) * sign;
    		    }

    		    function positiveMomentsDifference(base, other) {
    		        var res = {};

    		        res.months =
    		            other.month() - base.month() + (other.year() - base.year()) * 12;
    		        if (base.clone().add(res.months, 'M').isAfter(other)) {
    		            --res.months;
    		        }

    		        res.milliseconds = +other - +base.clone().add(res.months, 'M');

    		        return res;
    		    }

    		    function momentsDifference(base, other) {
    		        var res;
    		        if (!(base.isValid() && other.isValid())) {
    		            return { milliseconds: 0, months: 0 };
    		        }

    		        other = cloneWithOffset(other, base);
    		        if (base.isBefore(other)) {
    		            res = positiveMomentsDifference(base, other);
    		        } else {
    		            res = positiveMomentsDifference(other, base);
    		            res.milliseconds = -res.milliseconds;
    		            res.months = -res.months;
    		        }

    		        return res;
    		    }

    		    // TODO: remove 'name' arg after deprecation is removed
    		    function createAdder(direction, name) {
    		        return function (val, period) {
    		            var dur, tmp;
    		            //invert the arguments, but complain about it
    		            if (period !== null && !isNaN(+period)) {
    		                deprecateSimple(
    		                    name,
    		                    'moment().' +
    		                        name +
    		                        '(period, number) is deprecated. Please use moment().' +
    		                        name +
    		                        '(number, period). ' +
    		                        'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.'
    		                );
    		                tmp = val;
    		                val = period;
    		                period = tmp;
    		            }

    		            dur = createDuration(val, period);
    		            addSubtract(this, dur, direction);
    		            return this;
    		        };
    		    }

    		    function addSubtract(mom, duration, isAdding, updateOffset) {
    		        var milliseconds = duration._milliseconds,
    		            days = absRound(duration._days),
    		            months = absRound(duration._months);

    		        if (!mom.isValid()) {
    		            // No op
    		            return;
    		        }

    		        updateOffset = updateOffset == null ? true : updateOffset;

    		        if (months) {
    		            setMonth(mom, get(mom, 'Month') + months * isAdding);
    		        }
    		        if (days) {
    		            set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
    		        }
    		        if (milliseconds) {
    		            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
    		        }
    		        if (updateOffset) {
    		            hooks.updateOffset(mom, days || months);
    		        }
    		    }

    		    var add = createAdder(1, 'add'),
    		        subtract = createAdder(-1, 'subtract');

    		    function isString(input) {
    		        return typeof input === 'string' || input instanceof String;
    		    }

    		    // type MomentInput = Moment | Date | string | number | (number | string)[] | MomentInputObject | void; // null | undefined
    		    function isMomentInput(input) {
    		        return (
    		            isMoment(input) ||
    		            isDate(input) ||
    		            isString(input) ||
    		            isNumber(input) ||
    		            isNumberOrStringArray(input) ||
    		            isMomentInputObject(input) ||
    		            input === null ||
    		            input === undefined
    		        );
    		    }

    		    function isMomentInputObject(input) {
    		        var objectTest = isObject(input) && !isObjectEmpty(input),
    		            propertyTest = false,
    		            properties = [
    		                'years',
    		                'year',
    		                'y',
    		                'months',
    		                'month',
    		                'M',
    		                'days',
    		                'day',
    		                'd',
    		                'dates',
    		                'date',
    		                'D',
    		                'hours',
    		                'hour',
    		                'h',
    		                'minutes',
    		                'minute',
    		                'm',
    		                'seconds',
    		                'second',
    		                's',
    		                'milliseconds',
    		                'millisecond',
    		                'ms',
    		            ],
    		            i,
    		            property,
    		            propertyLen = properties.length;

    		        for (i = 0; i < propertyLen; i += 1) {
    		            property = properties[i];
    		            propertyTest = propertyTest || hasOwnProp(input, property);
    		        }

    		        return objectTest && propertyTest;
    		    }

    		    function isNumberOrStringArray(input) {
    		        var arrayTest = isArray(input),
    		            dataTypeTest = false;
    		        if (arrayTest) {
    		            dataTypeTest =
    		                input.filter(function (item) {
    		                    return !isNumber(item) && isString(input);
    		                }).length === 0;
    		        }
    		        return arrayTest && dataTypeTest;
    		    }

    		    function isCalendarSpec(input) {
    		        var objectTest = isObject(input) && !isObjectEmpty(input),
    		            propertyTest = false,
    		            properties = [
    		                'sameDay',
    		                'nextDay',
    		                'lastDay',
    		                'nextWeek',
    		                'lastWeek',
    		                'sameElse',
    		            ],
    		            i,
    		            property;

    		        for (i = 0; i < properties.length; i += 1) {
    		            property = properties[i];
    		            propertyTest = propertyTest || hasOwnProp(input, property);
    		        }

    		        return objectTest && propertyTest;
    		    }

    		    function getCalendarFormat(myMoment, now) {
    		        var diff = myMoment.diff(now, 'days', true);
    		        return diff < -6
    		            ? 'sameElse'
    		            : diff < -1
    		              ? 'lastWeek'
    		              : diff < 0
    		                ? 'lastDay'
    		                : diff < 1
    		                  ? 'sameDay'
    		                  : diff < 2
    		                    ? 'nextDay'
    		                    : diff < 7
    		                      ? 'nextWeek'
    		                      : 'sameElse';
    		    }

    		    function calendar$1(time, formats) {
    		        // Support for single parameter, formats only overload to the calendar function
    		        if (arguments.length === 1) {
    		            if (!arguments[0]) {
    		                time = undefined;
    		                formats = undefined;
    		            } else if (isMomentInput(arguments[0])) {
    		                time = arguments[0];
    		                formats = undefined;
    		            } else if (isCalendarSpec(arguments[0])) {
    		                formats = arguments[0];
    		                time = undefined;
    		            }
    		        }
    		        // We want to compare the start of today, vs this.
    		        // Getting start-of-today depends on whether we're local/utc/offset or not.
    		        var now = time || createLocal(),
    		            sod = cloneWithOffset(now, this).startOf('day'),
    		            format = hooks.calendarFormat(this, sod) || 'sameElse',
    		            output =
    		                formats &&
    		                (isFunction(formats[format])
    		                    ? formats[format].call(this, now)
    		                    : formats[format]);

    		        return this.format(
    		            output || this.localeData().calendar(format, this, createLocal(now))
    		        );
    		    }

    		    function clone() {
    		        return new Moment(this);
    		    }

    		    function isAfter(input, units) {
    		        var localInput = isMoment(input) ? input : createLocal(input);
    		        if (!(this.isValid() && localInput.isValid())) {
    		            return false;
    		        }
    		        units = normalizeUnits(units) || 'millisecond';
    		        if (units === 'millisecond') {
    		            return this.valueOf() > localInput.valueOf();
    		        } else {
    		            return localInput.valueOf() < this.clone().startOf(units).valueOf();
    		        }
    		    }

    		    function isBefore(input, units) {
    		        var localInput = isMoment(input) ? input : createLocal(input);
    		        if (!(this.isValid() && localInput.isValid())) {
    		            return false;
    		        }
    		        units = normalizeUnits(units) || 'millisecond';
    		        if (units === 'millisecond') {
    		            return this.valueOf() < localInput.valueOf();
    		        } else {
    		            return this.clone().endOf(units).valueOf() < localInput.valueOf();
    		        }
    		    }

    		    function isBetween(from, to, units, inclusivity) {
    		        var localFrom = isMoment(from) ? from : createLocal(from),
    		            localTo = isMoment(to) ? to : createLocal(to);
    		        if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
    		            return false;
    		        }
    		        inclusivity = inclusivity || '()';
    		        return (
    		            (inclusivity[0] === '('
    		                ? this.isAfter(localFrom, units)
    		                : !this.isBefore(localFrom, units)) &&
    		            (inclusivity[1] === ')'
    		                ? this.isBefore(localTo, units)
    		                : !this.isAfter(localTo, units))
    		        );
    		    }

    		    function isSame(input, units) {
    		        var localInput = isMoment(input) ? input : createLocal(input),
    		            inputMs;
    		        if (!(this.isValid() && localInput.isValid())) {
    		            return false;
    		        }
    		        units = normalizeUnits(units) || 'millisecond';
    		        if (units === 'millisecond') {
    		            return this.valueOf() === localInput.valueOf();
    		        } else {
    		            inputMs = localInput.valueOf();
    		            return (
    		                this.clone().startOf(units).valueOf() <= inputMs &&
    		                inputMs <= this.clone().endOf(units).valueOf()
    		            );
    		        }
    		    }

    		    function isSameOrAfter(input, units) {
    		        return this.isSame(input, units) || this.isAfter(input, units);
    		    }

    		    function isSameOrBefore(input, units) {
    		        return this.isSame(input, units) || this.isBefore(input, units);
    		    }

    		    function diff(input, units, asFloat) {
    		        var that, zoneDelta, output;

    		        if (!this.isValid()) {
    		            return NaN;
    		        }

    		        that = cloneWithOffset(input, this);

    		        if (!that.isValid()) {
    		            return NaN;
    		        }

    		        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

    		        units = normalizeUnits(units);

    		        switch (units) {
    		            case 'year':
    		                output = monthDiff(this, that) / 12;
    		                break;
    		            case 'month':
    		                output = monthDiff(this, that);
    		                break;
    		            case 'quarter':
    		                output = monthDiff(this, that) / 3;
    		                break;
    		            case 'second':
    		                output = (this - that) / 1e3;
    		                break; // 1000
    		            case 'minute':
    		                output = (this - that) / 6e4;
    		                break; // 1000 * 60
    		            case 'hour':
    		                output = (this - that) / 36e5;
    		                break; // 1000 * 60 * 60
    		            case 'day':
    		                output = (this - that - zoneDelta) / 864e5;
    		                break; // 1000 * 60 * 60 * 24, negate dst
    		            case 'week':
    		                output = (this - that - zoneDelta) / 6048e5;
    		                break; // 1000 * 60 * 60 * 24 * 7, negate dst
    		            default:
    		                output = this - that;
    		        }

    		        return asFloat ? output : absFloor(output);
    		    }

    		    function monthDiff(a, b) {
    		        if (a.date() < b.date()) {
    		            // end-of-month calculations work correct when the start month has more
    		            // days than the end month.
    		            return -monthDiff(b, a);
    		        }
    		        // difference in months
    		        var wholeMonthDiff = (b.year() - a.year()) * 12 + (b.month() - a.month()),
    		            // b is in (anchor - 1 month, anchor + 1 month)
    		            anchor = a.clone().add(wholeMonthDiff, 'months'),
    		            anchor2,
    		            adjust;

    		        if (b - anchor < 0) {
    		            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
    		            // linear across the month
    		            adjust = (b - anchor) / (anchor - anchor2);
    		        } else {
    		            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
    		            // linear across the month
    		            adjust = (b - anchor) / (anchor2 - anchor);
    		        }

    		        //check for negative zero, return zero if negative zero
    		        return -(wholeMonthDiff + adjust) || 0;
    		    }

    		    hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    		    hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    		    function toString() {
    		        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    		    }

    		    function toISOString(keepOffset) {
    		        if (!this.isValid()) {
    		            return null;
    		        }
    		        var utc = keepOffset !== true,
    		            m = utc ? this.clone().utc() : this;
    		        if (m.year() < 0 || m.year() > 9999) {
    		            return formatMoment(
    		                m,
    		                utc
    		                    ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
    		                    : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ'
    		            );
    		        }
    		        if (isFunction(Date.prototype.toISOString)) {
    		            // native implementation is ~50x faster, use it when we can
    		            if (utc) {
    		                return this.toDate().toISOString();
    		            } else {
    		                return new Date(this.valueOf() + this.utcOffset() * 60 * 1000)
    		                    .toISOString()
    		                    .replace('Z', formatMoment(m, 'Z'));
    		            }
    		        }
    		        return formatMoment(
    		            m,
    		            utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ'
    		        );
    		    }

    		    /**
    		     * Return a human readable representation of a moment that can
    		     * also be evaluated to get a new moment which is the same
    		     *
    		     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
    		     */
    		    function inspect() {
    		        if (!this.isValid()) {
    		            return 'moment.invalid(/* ' + this._i + ' */)';
    		        }
    		        var func = 'moment',
    		            zone = '',
    		            prefix,
    		            year,
    		            datetime,
    		            suffix;
    		        if (!this.isLocal()) {
    		            func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
    		            zone = 'Z';
    		        }
    		        prefix = '[' + func + '("]';
    		        year = 0 <= this.year() && this.year() <= 9999 ? 'YYYY' : 'YYYYYY';
    		        datetime = '-MM-DD[T]HH:mm:ss.SSS';
    		        suffix = zone + '[")]';

    		        return this.format(prefix + year + datetime + suffix);
    		    }

    		    function format(inputString) {
    		        if (!inputString) {
    		            inputString = this.isUtc()
    		                ? hooks.defaultFormatUtc
    		                : hooks.defaultFormat;
    		        }
    		        var output = formatMoment(this, inputString);
    		        return this.localeData().postformat(output);
    		    }

    		    function from(time, withoutSuffix) {
    		        if (
    		            this.isValid() &&
    		            ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
    		        ) {
    		            return createDuration({ to: this, from: time })
    		                .locale(this.locale())
    		                .humanize(!withoutSuffix);
    		        } else {
    		            return this.localeData().invalidDate();
    		        }
    		    }

    		    function fromNow(withoutSuffix) {
    		        return this.from(createLocal(), withoutSuffix);
    		    }

    		    function to(time, withoutSuffix) {
    		        if (
    		            this.isValid() &&
    		            ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
    		        ) {
    		            return createDuration({ from: this, to: time })
    		                .locale(this.locale())
    		                .humanize(!withoutSuffix);
    		        } else {
    		            return this.localeData().invalidDate();
    		        }
    		    }

    		    function toNow(withoutSuffix) {
    		        return this.to(createLocal(), withoutSuffix);
    		    }

    		    // If passed a locale key, it will set the locale for this
    		    // instance.  Otherwise, it will return the locale configuration
    		    // variables for this instance.
    		    function locale(key) {
    		        var newLocaleData;

    		        if (key === undefined) {
    		            return this._locale._abbr;
    		        } else {
    		            newLocaleData = getLocale(key);
    		            if (newLocaleData != null) {
    		                this._locale = newLocaleData;
    		            }
    		            return this;
    		        }
    		    }

    		    var lang = deprecate(
    		        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
    		        function (key) {
    		            if (key === undefined) {
    		                return this.localeData();
    		            } else {
    		                return this.locale(key);
    		            }
    		        }
    		    );

    		    function localeData() {
    		        return this._locale;
    		    }

    		    var MS_PER_SECOND = 1000,
    		        MS_PER_MINUTE = 60 * MS_PER_SECOND,
    		        MS_PER_HOUR = 60 * MS_PER_MINUTE,
    		        MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

    		    // actual modulo - handles negative numbers (for dates before 1970):
    		    function mod$1(dividend, divisor) {
    		        return ((dividend % divisor) + divisor) % divisor;
    		    }

    		    function localStartOfDate(y, m, d) {
    		        // the date constructor remaps years 0-99 to 1900-1999
    		        if (y < 100 && y >= 0) {
    		            // preserve leap years using a full 400 year cycle, then reset
    		            return new Date(y + 400, m, d) - MS_PER_400_YEARS;
    		        } else {
    		            return new Date(y, m, d).valueOf();
    		        }
    		    }

    		    function utcStartOfDate(y, m, d) {
    		        // Date.UTC remaps years 0-99 to 1900-1999
    		        if (y < 100 && y >= 0) {
    		            // preserve leap years using a full 400 year cycle, then reset
    		            return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
    		        } else {
    		            return Date.UTC(y, m, d);
    		        }
    		    }

    		    function startOf(units) {
    		        var time, startOfDate;
    		        units = normalizeUnits(units);
    		        if (units === undefined || units === 'millisecond' || !this.isValid()) {
    		            return this;
    		        }

    		        startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

    		        switch (units) {
    		            case 'year':
    		                time = startOfDate(this.year(), 0, 1);
    		                break;
    		            case 'quarter':
    		                time = startOfDate(
    		                    this.year(),
    		                    this.month() - (this.month() % 3),
    		                    1
    		                );
    		                break;
    		            case 'month':
    		                time = startOfDate(this.year(), this.month(), 1);
    		                break;
    		            case 'week':
    		                time = startOfDate(
    		                    this.year(),
    		                    this.month(),
    		                    this.date() - this.weekday()
    		                );
    		                break;
    		            case 'isoWeek':
    		                time = startOfDate(
    		                    this.year(),
    		                    this.month(),
    		                    this.date() - (this.isoWeekday() - 1)
    		                );
    		                break;
    		            case 'day':
    		            case 'date':
    		                time = startOfDate(this.year(), this.month(), this.date());
    		                break;
    		            case 'hour':
    		                time = this._d.valueOf();
    		                time -= mod$1(
    		                    time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
    		                    MS_PER_HOUR
    		                );
    		                break;
    		            case 'minute':
    		                time = this._d.valueOf();
    		                time -= mod$1(time, MS_PER_MINUTE);
    		                break;
    		            case 'second':
    		                time = this._d.valueOf();
    		                time -= mod$1(time, MS_PER_SECOND);
    		                break;
    		        }

    		        this._d.setTime(time);
    		        hooks.updateOffset(this, true);
    		        return this;
    		    }

    		    function endOf(units) {
    		        var time, startOfDate;
    		        units = normalizeUnits(units);
    		        if (units === undefined || units === 'millisecond' || !this.isValid()) {
    		            return this;
    		        }

    		        startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

    		        switch (units) {
    		            case 'year':
    		                time = startOfDate(this.year() + 1, 0, 1) - 1;
    		                break;
    		            case 'quarter':
    		                time =
    		                    startOfDate(
    		                        this.year(),
    		                        this.month() - (this.month() % 3) + 3,
    		                        1
    		                    ) - 1;
    		                break;
    		            case 'month':
    		                time = startOfDate(this.year(), this.month() + 1, 1) - 1;
    		                break;
    		            case 'week':
    		                time =
    		                    startOfDate(
    		                        this.year(),
    		                        this.month(),
    		                        this.date() - this.weekday() + 7
    		                    ) - 1;
    		                break;
    		            case 'isoWeek':
    		                time =
    		                    startOfDate(
    		                        this.year(),
    		                        this.month(),
    		                        this.date() - (this.isoWeekday() - 1) + 7
    		                    ) - 1;
    		                break;
    		            case 'day':
    		            case 'date':
    		                time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
    		                break;
    		            case 'hour':
    		                time = this._d.valueOf();
    		                time +=
    		                    MS_PER_HOUR -
    		                    mod$1(
    		                        time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
    		                        MS_PER_HOUR
    		                    ) -
    		                    1;
    		                break;
    		            case 'minute':
    		                time = this._d.valueOf();
    		                time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
    		                break;
    		            case 'second':
    		                time = this._d.valueOf();
    		                time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
    		                break;
    		        }

    		        this._d.setTime(time);
    		        hooks.updateOffset(this, true);
    		        return this;
    		    }

    		    function valueOf() {
    		        return this._d.valueOf() - (this._offset || 0) * 60000;
    		    }

    		    function unix() {
    		        return Math.floor(this.valueOf() / 1000);
    		    }

    		    function toDate() {
    		        return new Date(this.valueOf());
    		    }

    		    function toArray() {
    		        var m = this;
    		        return [
    		            m.year(),
    		            m.month(),
    		            m.date(),
    		            m.hour(),
    		            m.minute(),
    		            m.second(),
    		            m.millisecond(),
    		        ];
    		    }

    		    function toObject() {
    		        var m = this;
    		        return {
    		            years: m.year(),
    		            months: m.month(),
    		            date: m.date(),
    		            hours: m.hours(),
    		            minutes: m.minutes(),
    		            seconds: m.seconds(),
    		            milliseconds: m.milliseconds(),
    		        };
    		    }

    		    function toJSON() {
    		        // new Date(NaN).toJSON() === null
    		        return this.isValid() ? this.toISOString() : null;
    		    }

    		    function isValid$2() {
    		        return isValid(this);
    		    }

    		    function parsingFlags() {
    		        return extend({}, getParsingFlags(this));
    		    }

    		    function invalidAt() {
    		        return getParsingFlags(this).overflow;
    		    }

    		    function creationData() {
    		        return {
    		            input: this._i,
    		            format: this._f,
    		            locale: this._locale,
    		            isUTC: this._isUTC,
    		            strict: this._strict,
    		        };
    		    }

    		    addFormatToken('N', 0, 0, 'eraAbbr');
    		    addFormatToken('NN', 0, 0, 'eraAbbr');
    		    addFormatToken('NNN', 0, 0, 'eraAbbr');
    		    addFormatToken('NNNN', 0, 0, 'eraName');
    		    addFormatToken('NNNNN', 0, 0, 'eraNarrow');

    		    addFormatToken('y', ['y', 1], 'yo', 'eraYear');
    		    addFormatToken('y', ['yy', 2], 0, 'eraYear');
    		    addFormatToken('y', ['yyy', 3], 0, 'eraYear');
    		    addFormatToken('y', ['yyyy', 4], 0, 'eraYear');

    		    addRegexToken('N', matchEraAbbr);
    		    addRegexToken('NN', matchEraAbbr);
    		    addRegexToken('NNN', matchEraAbbr);
    		    addRegexToken('NNNN', matchEraName);
    		    addRegexToken('NNNNN', matchEraNarrow);

    		    addParseToken(
    		        ['N', 'NN', 'NNN', 'NNNN', 'NNNNN'],
    		        function (input, array, config, token) {
    		            var era = config._locale.erasParse(input, token, config._strict);
    		            if (era) {
    		                getParsingFlags(config).era = era;
    		            } else {
    		                getParsingFlags(config).invalidEra = input;
    		            }
    		        }
    		    );

    		    addRegexToken('y', matchUnsigned);
    		    addRegexToken('yy', matchUnsigned);
    		    addRegexToken('yyy', matchUnsigned);
    		    addRegexToken('yyyy', matchUnsigned);
    		    addRegexToken('yo', matchEraYearOrdinal);

    		    addParseToken(['y', 'yy', 'yyy', 'yyyy'], YEAR);
    		    addParseToken(['yo'], function (input, array, config, token) {
    		        var match;
    		        if (config._locale._eraYearOrdinalRegex) {
    		            match = input.match(config._locale._eraYearOrdinalRegex);
    		        }

    		        if (config._locale.eraYearOrdinalParse) {
    		            array[YEAR] = config._locale.eraYearOrdinalParse(input, match);
    		        } else {
    		            array[YEAR] = parseInt(input, 10);
    		        }
    		    });

    		    function localeEras(m, format) {
    		        var i,
    		            l,
    		            date,
    		            eras = this._eras || getLocale('en')._eras;
    		        for (i = 0, l = eras.length; i < l; ++i) {
    		            switch (typeof eras[i].since) {
    		                case 'string':
    		                    // truncate time
    		                    date = hooks(eras[i].since).startOf('day');
    		                    eras[i].since = date.valueOf();
    		                    break;
    		            }

    		            switch (typeof eras[i].until) {
    		                case 'undefined':
    		                    eras[i].until = +Infinity;
    		                    break;
    		                case 'string':
    		                    // truncate time
    		                    date = hooks(eras[i].until).startOf('day').valueOf();
    		                    eras[i].until = date.valueOf();
    		                    break;
    		            }
    		        }
    		        return eras;
    		    }

    		    function localeErasParse(eraName, format, strict) {
    		        var i,
    		            l,
    		            eras = this.eras(),
    		            name,
    		            abbr,
    		            narrow;
    		        eraName = eraName.toUpperCase();

    		        for (i = 0, l = eras.length; i < l; ++i) {
    		            name = eras[i].name.toUpperCase();
    		            abbr = eras[i].abbr.toUpperCase();
    		            narrow = eras[i].narrow.toUpperCase();

    		            if (strict) {
    		                switch (format) {
    		                    case 'N':
    		                    case 'NN':
    		                    case 'NNN':
    		                        if (abbr === eraName) {
    		                            return eras[i];
    		                        }
    		                        break;

    		                    case 'NNNN':
    		                        if (name === eraName) {
    		                            return eras[i];
    		                        }
    		                        break;

    		                    case 'NNNNN':
    		                        if (narrow === eraName) {
    		                            return eras[i];
    		                        }
    		                        break;
    		                }
    		            } else if ([name, abbr, narrow].indexOf(eraName) >= 0) {
    		                return eras[i];
    		            }
    		        }
    		    }

    		    function localeErasConvertYear(era, year) {
    		        var dir = era.since <= era.until ? 1 : -1;
    		        if (year === undefined) {
    		            return hooks(era.since).year();
    		        } else {
    		            return hooks(era.since).year() + (year - era.offset) * dir;
    		        }
    		    }

    		    function getEraName() {
    		        var i,
    		            l,
    		            val,
    		            eras = this.localeData().eras();
    		        for (i = 0, l = eras.length; i < l; ++i) {
    		            // truncate time
    		            val = this.clone().startOf('day').valueOf();

    		            if (eras[i].since <= val && val <= eras[i].until) {
    		                return eras[i].name;
    		            }
    		            if (eras[i].until <= val && val <= eras[i].since) {
    		                return eras[i].name;
    		            }
    		        }

    		        return '';
    		    }

    		    function getEraNarrow() {
    		        var i,
    		            l,
    		            val,
    		            eras = this.localeData().eras();
    		        for (i = 0, l = eras.length; i < l; ++i) {
    		            // truncate time
    		            val = this.clone().startOf('day').valueOf();

    		            if (eras[i].since <= val && val <= eras[i].until) {
    		                return eras[i].narrow;
    		            }
    		            if (eras[i].until <= val && val <= eras[i].since) {
    		                return eras[i].narrow;
    		            }
    		        }

    		        return '';
    		    }

    		    function getEraAbbr() {
    		        var i,
    		            l,
    		            val,
    		            eras = this.localeData().eras();
    		        for (i = 0, l = eras.length; i < l; ++i) {
    		            // truncate time
    		            val = this.clone().startOf('day').valueOf();

    		            if (eras[i].since <= val && val <= eras[i].until) {
    		                return eras[i].abbr;
    		            }
    		            if (eras[i].until <= val && val <= eras[i].since) {
    		                return eras[i].abbr;
    		            }
    		        }

    		        return '';
    		    }

    		    function getEraYear() {
    		        var i,
    		            l,
    		            dir,
    		            val,
    		            eras = this.localeData().eras();
    		        for (i = 0, l = eras.length; i < l; ++i) {
    		            dir = eras[i].since <= eras[i].until ? 1 : -1;

    		            // truncate time
    		            val = this.clone().startOf('day').valueOf();

    		            if (
    		                (eras[i].since <= val && val <= eras[i].until) ||
    		                (eras[i].until <= val && val <= eras[i].since)
    		            ) {
    		                return (
    		                    (this.year() - hooks(eras[i].since).year()) * dir +
    		                    eras[i].offset
    		                );
    		            }
    		        }

    		        return this.year();
    		    }

    		    function erasNameRegex(isStrict) {
    		        if (!hasOwnProp(this, '_erasNameRegex')) {
    		            computeErasParse.call(this);
    		        }
    		        return isStrict ? this._erasNameRegex : this._erasRegex;
    		    }

    		    function erasAbbrRegex(isStrict) {
    		        if (!hasOwnProp(this, '_erasAbbrRegex')) {
    		            computeErasParse.call(this);
    		        }
    		        return isStrict ? this._erasAbbrRegex : this._erasRegex;
    		    }

    		    function erasNarrowRegex(isStrict) {
    		        if (!hasOwnProp(this, '_erasNarrowRegex')) {
    		            computeErasParse.call(this);
    		        }
    		        return isStrict ? this._erasNarrowRegex : this._erasRegex;
    		    }

    		    function matchEraAbbr(isStrict, locale) {
    		        return locale.erasAbbrRegex(isStrict);
    		    }

    		    function matchEraName(isStrict, locale) {
    		        return locale.erasNameRegex(isStrict);
    		    }

    		    function matchEraNarrow(isStrict, locale) {
    		        return locale.erasNarrowRegex(isStrict);
    		    }

    		    function matchEraYearOrdinal(isStrict, locale) {
    		        return locale._eraYearOrdinalRegex || matchUnsigned;
    		    }

    		    function computeErasParse() {
    		        var abbrPieces = [],
    		            namePieces = [],
    		            narrowPieces = [],
    		            mixedPieces = [],
    		            i,
    		            l,
    		            erasName,
    		            erasAbbr,
    		            erasNarrow,
    		            eras = this.eras();

    		        for (i = 0, l = eras.length; i < l; ++i) {
    		            erasName = regexEscape(eras[i].name);
    		            erasAbbr = regexEscape(eras[i].abbr);
    		            erasNarrow = regexEscape(eras[i].narrow);

    		            namePieces.push(erasName);
    		            abbrPieces.push(erasAbbr);
    		            narrowPieces.push(erasNarrow);
    		            mixedPieces.push(erasName);
    		            mixedPieces.push(erasAbbr);
    		            mixedPieces.push(erasNarrow);
    		        }

    		        this._erasRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
    		        this._erasNameRegex = new RegExp('^(' + namePieces.join('|') + ')', 'i');
    		        this._erasAbbrRegex = new RegExp('^(' + abbrPieces.join('|') + ')', 'i');
    		        this._erasNarrowRegex = new RegExp(
    		            '^(' + narrowPieces.join('|') + ')',
    		            'i'
    		        );
    		    }

    		    // FORMATTING

    		    addFormatToken(0, ['gg', 2], 0, function () {
    		        return this.weekYear() % 100;
    		    });

    		    addFormatToken(0, ['GG', 2], 0, function () {
    		        return this.isoWeekYear() % 100;
    		    });

    		    function addWeekYearFormatToken(token, getter) {
    		        addFormatToken(0, [token, token.length], 0, getter);
    		    }

    		    addWeekYearFormatToken('gggg', 'weekYear');
    		    addWeekYearFormatToken('ggggg', 'weekYear');
    		    addWeekYearFormatToken('GGGG', 'isoWeekYear');
    		    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    		    // ALIASES

    		    // PARSING

    		    addRegexToken('G', matchSigned);
    		    addRegexToken('g', matchSigned);
    		    addRegexToken('GG', match1to2, match2);
    		    addRegexToken('gg', match1to2, match2);
    		    addRegexToken('GGGG', match1to4, match4);
    		    addRegexToken('gggg', match1to4, match4);
    		    addRegexToken('GGGGG', match1to6, match6);
    		    addRegexToken('ggggg', match1to6, match6);

    		    addWeekParseToken(
    		        ['gggg', 'ggggg', 'GGGG', 'GGGGG'],
    		        function (input, week, config, token) {
    		            week[token.substr(0, 2)] = toInt(input);
    		        }
    		    );

    		    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
    		        week[token] = hooks.parseTwoDigitYear(input);
    		    });

    		    // MOMENTS

    		    function getSetWeekYear(input) {
    		        return getSetWeekYearHelper.call(
    		            this,
    		            input,
    		            this.week(),
    		            this.weekday() + this.localeData()._week.dow,
    		            this.localeData()._week.dow,
    		            this.localeData()._week.doy
    		        );
    		    }

    		    function getSetISOWeekYear(input) {
    		        return getSetWeekYearHelper.call(
    		            this,
    		            input,
    		            this.isoWeek(),
    		            this.isoWeekday(),
    		            1,
    		            4
    		        );
    		    }

    		    function getISOWeeksInYear() {
    		        return weeksInYear(this.year(), 1, 4);
    		    }

    		    function getISOWeeksInISOWeekYear() {
    		        return weeksInYear(this.isoWeekYear(), 1, 4);
    		    }

    		    function getWeeksInYear() {
    		        var weekInfo = this.localeData()._week;
    		        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    		    }

    		    function getWeeksInWeekYear() {
    		        var weekInfo = this.localeData()._week;
    		        return weeksInYear(this.weekYear(), weekInfo.dow, weekInfo.doy);
    		    }

    		    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
    		        var weeksTarget;
    		        if (input == null) {
    		            return weekOfYear(this, dow, doy).year;
    		        } else {
    		            weeksTarget = weeksInYear(input, dow, doy);
    		            if (week > weeksTarget) {
    		                week = weeksTarget;
    		            }
    		            return setWeekAll.call(this, input, week, weekday, dow, doy);
    		        }
    		    }

    		    function setWeekAll(weekYear, week, weekday, dow, doy) {
    		        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
    		            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

    		        this.year(date.getUTCFullYear());
    		        this.month(date.getUTCMonth());
    		        this.date(date.getUTCDate());
    		        return this;
    		    }

    		    // FORMATTING

    		    addFormatToken('Q', 0, 'Qo', 'quarter');

    		    // PARSING

    		    addRegexToken('Q', match1);
    		    addParseToken('Q', function (input, array) {
    		        array[MONTH] = (toInt(input) - 1) * 3;
    		    });

    		    // MOMENTS

    		    function getSetQuarter(input) {
    		        return input == null
    		            ? Math.ceil((this.month() + 1) / 3)
    		            : this.month((input - 1) * 3 + (this.month() % 3));
    		    }

    		    // FORMATTING

    		    addFormatToken('D', ['DD', 2], 'Do', 'date');

    		    // PARSING

    		    addRegexToken('D', match1to2, match1to2NoLeadingZero);
    		    addRegexToken('DD', match1to2, match2);
    		    addRegexToken('Do', function (isStrict, locale) {
    		        // TODO: Remove "ordinalParse" fallback in next major release.
    		        return isStrict
    		            ? locale._dayOfMonthOrdinalParse || locale._ordinalParse
    		            : locale._dayOfMonthOrdinalParseLenient;
    		    });

    		    addParseToken(['D', 'DD'], DATE);
    		    addParseToken('Do', function (input, array) {
    		        array[DATE] = toInt(input.match(match1to2)[0]);
    		    });

    		    // MOMENTS

    		    var getSetDayOfMonth = makeGetSet('Date', true);

    		    // FORMATTING

    		    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    		    // PARSING

    		    addRegexToken('DDD', match1to3);
    		    addRegexToken('DDDD', match3);
    		    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
    		        config._dayOfYear = toInt(input);
    		    });

    		    // HELPERS

    		    // MOMENTS

    		    function getSetDayOfYear(input) {
    		        var dayOfYear =
    		            Math.round(
    		                (this.clone().startOf('day') - this.clone().startOf('year')) / 864e5
    		            ) + 1;
    		        return input == null ? dayOfYear : this.add(input - dayOfYear, 'd');
    		    }

    		    // FORMATTING

    		    addFormatToken('m', ['mm', 2], 0, 'minute');

    		    // PARSING

    		    addRegexToken('m', match1to2, match1to2HasZero);
    		    addRegexToken('mm', match1to2, match2);
    		    addParseToken(['m', 'mm'], MINUTE);

    		    // MOMENTS

    		    var getSetMinute = makeGetSet('Minutes', false);

    		    // FORMATTING

    		    addFormatToken('s', ['ss', 2], 0, 'second');

    		    // PARSING

    		    addRegexToken('s', match1to2, match1to2HasZero);
    		    addRegexToken('ss', match1to2, match2);
    		    addParseToken(['s', 'ss'], SECOND);

    		    // MOMENTS

    		    var getSetSecond = makeGetSet('Seconds', false);

    		    // FORMATTING

    		    addFormatToken('S', 0, 0, function () {
    		        return ~~(this.millisecond() / 100);
    		    });

    		    addFormatToken(0, ['SS', 2], 0, function () {
    		        return ~~(this.millisecond() / 10);
    		    });

    		    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    		    addFormatToken(0, ['SSSS', 4], 0, function () {
    		        return this.millisecond() * 10;
    		    });
    		    addFormatToken(0, ['SSSSS', 5], 0, function () {
    		        return this.millisecond() * 100;
    		    });
    		    addFormatToken(0, ['SSSSSS', 6], 0, function () {
    		        return this.millisecond() * 1000;
    		    });
    		    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
    		        return this.millisecond() * 10000;
    		    });
    		    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
    		        return this.millisecond() * 100000;
    		    });
    		    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
    		        return this.millisecond() * 1000000;
    		    });

    		    // PARSING

    		    addRegexToken('S', match1to3, match1);
    		    addRegexToken('SS', match1to3, match2);
    		    addRegexToken('SSS', match1to3, match3);

    		    var token, getSetMillisecond;
    		    for (token = 'SSSS'; token.length <= 9; token += 'S') {
    		        addRegexToken(token, matchUnsigned);
    		    }

    		    function parseMs(input, array) {
    		        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    		    }

    		    for (token = 'S'; token.length <= 9; token += 'S') {
    		        addParseToken(token, parseMs);
    		    }

    		    getSetMillisecond = makeGetSet('Milliseconds', false);

    		    // FORMATTING

    		    addFormatToken('z', 0, 0, 'zoneAbbr');
    		    addFormatToken('zz', 0, 0, 'zoneName');

    		    // MOMENTS

    		    function getZoneAbbr() {
    		        return this._isUTC ? 'UTC' : '';
    		    }

    		    function getZoneName() {
    		        return this._isUTC ? 'Coordinated Universal Time' : '';
    		    }

    		    var proto = Moment.prototype;

    		    proto.add = add;
    		    proto.calendar = calendar$1;
    		    proto.clone = clone;
    		    proto.diff = diff;
    		    proto.endOf = endOf;
    		    proto.format = format;
    		    proto.from = from;
    		    proto.fromNow = fromNow;
    		    proto.to = to;
    		    proto.toNow = toNow;
    		    proto.get = stringGet;
    		    proto.invalidAt = invalidAt;
    		    proto.isAfter = isAfter;
    		    proto.isBefore = isBefore;
    		    proto.isBetween = isBetween;
    		    proto.isSame = isSame;
    		    proto.isSameOrAfter = isSameOrAfter;
    		    proto.isSameOrBefore = isSameOrBefore;
    		    proto.isValid = isValid$2;
    		    proto.lang = lang;
    		    proto.locale = locale;
    		    proto.localeData = localeData;
    		    proto.max = prototypeMax;
    		    proto.min = prototypeMin;
    		    proto.parsingFlags = parsingFlags;
    		    proto.set = stringSet;
    		    proto.startOf = startOf;
    		    proto.subtract = subtract;
    		    proto.toArray = toArray;
    		    proto.toObject = toObject;
    		    proto.toDate = toDate;
    		    proto.toISOString = toISOString;
    		    proto.inspect = inspect;
    		    if (typeof Symbol !== 'undefined' && Symbol.for != null) {
    		        proto[Symbol.for('nodejs.util.inspect.custom')] = function () {
    		            return 'Moment<' + this.format() + '>';
    		        };
    		    }
    		    proto.toJSON = toJSON;
    		    proto.toString = toString;
    		    proto.unix = unix;
    		    proto.valueOf = valueOf;
    		    proto.creationData = creationData;
    		    proto.eraName = getEraName;
    		    proto.eraNarrow = getEraNarrow;
    		    proto.eraAbbr = getEraAbbr;
    		    proto.eraYear = getEraYear;
    		    proto.year = getSetYear;
    		    proto.isLeapYear = getIsLeapYear;
    		    proto.weekYear = getSetWeekYear;
    		    proto.isoWeekYear = getSetISOWeekYear;
    		    proto.quarter = proto.quarters = getSetQuarter;
    		    proto.month = getSetMonth;
    		    proto.daysInMonth = getDaysInMonth;
    		    proto.week = proto.weeks = getSetWeek;
    		    proto.isoWeek = proto.isoWeeks = getSetISOWeek;
    		    proto.weeksInYear = getWeeksInYear;
    		    proto.weeksInWeekYear = getWeeksInWeekYear;
    		    proto.isoWeeksInYear = getISOWeeksInYear;
    		    proto.isoWeeksInISOWeekYear = getISOWeeksInISOWeekYear;
    		    proto.date = getSetDayOfMonth;
    		    proto.day = proto.days = getSetDayOfWeek;
    		    proto.weekday = getSetLocaleDayOfWeek;
    		    proto.isoWeekday = getSetISODayOfWeek;
    		    proto.dayOfYear = getSetDayOfYear;
    		    proto.hour = proto.hours = getSetHour;
    		    proto.minute = proto.minutes = getSetMinute;
    		    proto.second = proto.seconds = getSetSecond;
    		    proto.millisecond = proto.milliseconds = getSetMillisecond;
    		    proto.utcOffset = getSetOffset;
    		    proto.utc = setOffsetToUTC;
    		    proto.local = setOffsetToLocal;
    		    proto.parseZone = setOffsetToParsedOffset;
    		    proto.hasAlignedHourOffset = hasAlignedHourOffset;
    		    proto.isDST = isDaylightSavingTime;
    		    proto.isLocal = isLocal;
    		    proto.isUtcOffset = isUtcOffset;
    		    proto.isUtc = isUtc;
    		    proto.isUTC = isUtc;
    		    proto.zoneAbbr = getZoneAbbr;
    		    proto.zoneName = getZoneName;
    		    proto.dates = deprecate(
    		        'dates accessor is deprecated. Use date instead.',
    		        getSetDayOfMonth
    		    );
    		    proto.months = deprecate(
    		        'months accessor is deprecated. Use month instead',
    		        getSetMonth
    		    );
    		    proto.years = deprecate(
    		        'years accessor is deprecated. Use year instead',
    		        getSetYear
    		    );
    		    proto.zone = deprecate(
    		        'moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/',
    		        getSetZone
    		    );
    		    proto.isDSTShifted = deprecate(
    		        'isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information',
    		        isDaylightSavingTimeShifted
    		    );

    		    function createUnix(input) {
    		        return createLocal(input * 1000);
    		    }

    		    function createInZone() {
    		        return createLocal.apply(null, arguments).parseZone();
    		    }

    		    function preParsePostFormat(string) {
    		        return string;
    		    }

    		    var proto$1 = Locale.prototype;

    		    proto$1.calendar = calendar;
    		    proto$1.longDateFormat = longDateFormat;
    		    proto$1.invalidDate = invalidDate;
    		    proto$1.ordinal = ordinal;
    		    proto$1.preparse = preParsePostFormat;
    		    proto$1.postformat = preParsePostFormat;
    		    proto$1.relativeTime = relativeTime;
    		    proto$1.pastFuture = pastFuture;
    		    proto$1.set = set;
    		    proto$1.eras = localeEras;
    		    proto$1.erasParse = localeErasParse;
    		    proto$1.erasConvertYear = localeErasConvertYear;
    		    proto$1.erasAbbrRegex = erasAbbrRegex;
    		    proto$1.erasNameRegex = erasNameRegex;
    		    proto$1.erasNarrowRegex = erasNarrowRegex;

    		    proto$1.months = localeMonths;
    		    proto$1.monthsShort = localeMonthsShort;
    		    proto$1.monthsParse = localeMonthsParse;
    		    proto$1.monthsRegex = monthsRegex;
    		    proto$1.monthsShortRegex = monthsShortRegex;
    		    proto$1.week = localeWeek;
    		    proto$1.firstDayOfYear = localeFirstDayOfYear;
    		    proto$1.firstDayOfWeek = localeFirstDayOfWeek;

    		    proto$1.weekdays = localeWeekdays;
    		    proto$1.weekdaysMin = localeWeekdaysMin;
    		    proto$1.weekdaysShort = localeWeekdaysShort;
    		    proto$1.weekdaysParse = localeWeekdaysParse;

    		    proto$1.weekdaysRegex = weekdaysRegex;
    		    proto$1.weekdaysShortRegex = weekdaysShortRegex;
    		    proto$1.weekdaysMinRegex = weekdaysMinRegex;

    		    proto$1.isPM = localeIsPM;
    		    proto$1.meridiem = localeMeridiem;

    		    function get$1(format, index, field, setter) {
    		        var locale = getLocale(),
    		            utc = createUTC().set(setter, index);
    		        return locale[field](utc, format);
    		    }

    		    function listMonthsImpl(format, index, field) {
    		        if (isNumber(format)) {
    		            index = format;
    		            format = undefined;
    		        }

    		        format = format || '';

    		        if (index != null) {
    		            return get$1(format, index, field, 'month');
    		        }

    		        var i,
    		            out = [];
    		        for (i = 0; i < 12; i++) {
    		            out[i] = get$1(format, i, field, 'month');
    		        }
    		        return out;
    		    }

    		    // ()
    		    // (5)
    		    // (fmt, 5)
    		    // (fmt)
    		    // (true)
    		    // (true, 5)
    		    // (true, fmt, 5)
    		    // (true, fmt)
    		    function listWeekdaysImpl(localeSorted, format, index, field) {
    		        if (typeof localeSorted === 'boolean') {
    		            if (isNumber(format)) {
    		                index = format;
    		                format = undefined;
    		            }

    		            format = format || '';
    		        } else {
    		            format = localeSorted;
    		            index = format;
    		            localeSorted = false;

    		            if (isNumber(format)) {
    		                index = format;
    		                format = undefined;
    		            }

    		            format = format || '';
    		        }

    		        var locale = getLocale(),
    		            shift = localeSorted ? locale._week.dow : 0,
    		            i,
    		            out = [];

    		        if (index != null) {
    		            return get$1(format, (index + shift) % 7, field, 'day');
    		        }

    		        for (i = 0; i < 7; i++) {
    		            out[i] = get$1(format, (i + shift) % 7, field, 'day');
    		        }
    		        return out;
    		    }

    		    function listMonths(format, index) {
    		        return listMonthsImpl(format, index, 'months');
    		    }

    		    function listMonthsShort(format, index) {
    		        return listMonthsImpl(format, index, 'monthsShort');
    		    }

    		    function listWeekdays(localeSorted, format, index) {
    		        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    		    }

    		    function listWeekdaysShort(localeSorted, format, index) {
    		        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    		    }

    		    function listWeekdaysMin(localeSorted, format, index) {
    		        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    		    }

    		    getSetGlobalLocale('en', {
    		        eras: [
    		            {
    		                since: '0001-01-01',
    		                until: +Infinity,
    		                offset: 1,
    		                name: 'Anno Domini',
    		                narrow: 'AD',
    		                abbr: 'AD',
    		            },
    		            {
    		                since: '0000-12-31',
    		                until: -Infinity,
    		                offset: 1,
    		                name: 'Before Christ',
    		                narrow: 'BC',
    		                abbr: 'BC',
    		            },
    		        ],
    		        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
    		        ordinal: function (number) {
    		            var b = number % 10,
    		                output =
    		                    toInt((number % 100) / 10) === 1
    		                        ? 'th'
    		                        : b === 1
    		                          ? 'st'
    		                          : b === 2
    		                            ? 'nd'
    		                            : b === 3
    		                              ? 'rd'
    		                              : 'th';
    		            return number + output;
    		        },
    		    });

    		    // Side effect imports

    		    hooks.lang = deprecate(
    		        'moment.lang is deprecated. Use moment.locale instead.',
    		        getSetGlobalLocale
    		    );
    		    hooks.langData = deprecate(
    		        'moment.langData is deprecated. Use moment.localeData instead.',
    		        getLocale
    		    );

    		    var mathAbs = Math.abs;

    		    function abs() {
    		        var data = this._data;

    		        this._milliseconds = mathAbs(this._milliseconds);
    		        this._days = mathAbs(this._days);
    		        this._months = mathAbs(this._months);

    		        data.milliseconds = mathAbs(data.milliseconds);
    		        data.seconds = mathAbs(data.seconds);
    		        data.minutes = mathAbs(data.minutes);
    		        data.hours = mathAbs(data.hours);
    		        data.months = mathAbs(data.months);
    		        data.years = mathAbs(data.years);

    		        return this;
    		    }

    		    function addSubtract$1(duration, input, value, direction) {
    		        var other = createDuration(input, value);

    		        duration._milliseconds += direction * other._milliseconds;
    		        duration._days += direction * other._days;
    		        duration._months += direction * other._months;

    		        return duration._bubble();
    		    }

    		    // supports only 2.0-style add(1, 's') or add(duration)
    		    function add$1(input, value) {
    		        return addSubtract$1(this, input, value, 1);
    		    }

    		    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    		    function subtract$1(input, value) {
    		        return addSubtract$1(this, input, value, -1);
    		    }

    		    function absCeil(number) {
    		        if (number < 0) {
    		            return Math.floor(number);
    		        } else {
    		            return Math.ceil(number);
    		        }
    		    }

    		    function bubble() {
    		        var milliseconds = this._milliseconds,
    		            days = this._days,
    		            months = this._months,
    		            data = this._data,
    		            seconds,
    		            minutes,
    		            hours,
    		            years,
    		            monthsFromDays;

    		        // if we have a mix of positive and negative values, bubble down first
    		        // check: https://github.com/moment/moment/issues/2166
    		        if (
    		            !(
    		                (milliseconds >= 0 && days >= 0 && months >= 0) ||
    		                (milliseconds <= 0 && days <= 0 && months <= 0)
    		            )
    		        ) {
    		            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
    		            days = 0;
    		            months = 0;
    		        }

    		        // The following code bubbles up values, see the tests for
    		        // examples of what that means.
    		        data.milliseconds = milliseconds % 1000;

    		        seconds = absFloor(milliseconds / 1000);
    		        data.seconds = seconds % 60;

    		        minutes = absFloor(seconds / 60);
    		        data.minutes = minutes % 60;

    		        hours = absFloor(minutes / 60);
    		        data.hours = hours % 24;

    		        days += absFloor(hours / 24);

    		        // convert days to months
    		        monthsFromDays = absFloor(daysToMonths(days));
    		        months += monthsFromDays;
    		        days -= absCeil(monthsToDays(monthsFromDays));

    		        // 12 months -> 1 year
    		        years = absFloor(months / 12);
    		        months %= 12;

    		        data.days = days;
    		        data.months = months;
    		        data.years = years;

    		        return this;
    		    }

    		    function daysToMonths(days) {
    		        // 400 years have 146097 days (taking into account leap year rules)
    		        // 400 years have 12 months === 4800
    		        return (days * 4800) / 146097;
    		    }

    		    function monthsToDays(months) {
    		        // the reverse of daysToMonths
    		        return (months * 146097) / 4800;
    		    }

    		    function as(units) {
    		        if (!this.isValid()) {
    		            return NaN;
    		        }
    		        var days,
    		            months,
    		            milliseconds = this._milliseconds;

    		        units = normalizeUnits(units);

    		        if (units === 'month' || units === 'quarter' || units === 'year') {
    		            days = this._days + milliseconds / 864e5;
    		            months = this._months + daysToMonths(days);
    		            switch (units) {
    		                case 'month':
    		                    return months;
    		                case 'quarter':
    		                    return months / 3;
    		                case 'year':
    		                    return months / 12;
    		            }
    		        } else {
    		            // handle milliseconds separately because of floating point math errors (issue #1867)
    		            days = this._days + Math.round(monthsToDays(this._months));
    		            switch (units) {
    		                case 'week':
    		                    return days / 7 + milliseconds / 6048e5;
    		                case 'day':
    		                    return days + milliseconds / 864e5;
    		                case 'hour':
    		                    return days * 24 + milliseconds / 36e5;
    		                case 'minute':
    		                    return days * 1440 + milliseconds / 6e4;
    		                case 'second':
    		                    return days * 86400 + milliseconds / 1000;
    		                // Math.floor prevents floating point math errors here
    		                case 'millisecond':
    		                    return Math.floor(days * 864e5) + milliseconds;
    		                default:
    		                    throw new Error('Unknown unit ' + units);
    		            }
    		        }
    		    }

    		    function makeAs(alias) {
    		        return function () {
    		            return this.as(alias);
    		        };
    		    }

    		    var asMilliseconds = makeAs('ms'),
    		        asSeconds = makeAs('s'),
    		        asMinutes = makeAs('m'),
    		        asHours = makeAs('h'),
    		        asDays = makeAs('d'),
    		        asWeeks = makeAs('w'),
    		        asMonths = makeAs('M'),
    		        asQuarters = makeAs('Q'),
    		        asYears = makeAs('y'),
    		        valueOf$1 = asMilliseconds;

    		    function clone$1() {
    		        return createDuration(this);
    		    }

    		    function get$2(units) {
    		        units = normalizeUnits(units);
    		        return this.isValid() ? this[units + 's']() : NaN;
    		    }

    		    function makeGetter(name) {
    		        return function () {
    		            return this.isValid() ? this._data[name] : NaN;
    		        };
    		    }

    		    var milliseconds = makeGetter('milliseconds'),
    		        seconds = makeGetter('seconds'),
    		        minutes = makeGetter('minutes'),
    		        hours = makeGetter('hours'),
    		        days = makeGetter('days'),
    		        months = makeGetter('months'),
    		        years = makeGetter('years');

    		    function weeks() {
    		        return absFloor(this.days() / 7);
    		    }

    		    var round = Math.round,
    		        thresholds = {
    		            ss: 44, // a few seconds to seconds
    		            s: 45, // seconds to minute
    		            m: 45, // minutes to hour
    		            h: 22, // hours to day
    		            d: 26, // days to month/week
    		            w: null, // weeks to month
    		            M: 11, // months to year
    		        };

    		    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    		    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
    		        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    		    }

    		    function relativeTime$1(posNegDuration, withoutSuffix, thresholds, locale) {
    		        var duration = createDuration(posNegDuration).abs(),
    		            seconds = round(duration.as('s')),
    		            minutes = round(duration.as('m')),
    		            hours = round(duration.as('h')),
    		            days = round(duration.as('d')),
    		            months = round(duration.as('M')),
    		            weeks = round(duration.as('w')),
    		            years = round(duration.as('y')),
    		            a =
    		                (seconds <= thresholds.ss && ['s', seconds]) ||
    		                (seconds < thresholds.s && ['ss', seconds]) ||
    		                (minutes <= 1 && ['m']) ||
    		                (minutes < thresholds.m && ['mm', minutes]) ||
    		                (hours <= 1 && ['h']) ||
    		                (hours < thresholds.h && ['hh', hours]) ||
    		                (days <= 1 && ['d']) ||
    		                (days < thresholds.d && ['dd', days]);

    		        if (thresholds.w != null) {
    		            a =
    		                a ||
    		                (weeks <= 1 && ['w']) ||
    		                (weeks < thresholds.w && ['ww', weeks]);
    		        }
    		        a = a ||
    		            (months <= 1 && ['M']) ||
    		            (months < thresholds.M && ['MM', months]) ||
    		            (years <= 1 && ['y']) || ['yy', years];

    		        a[2] = withoutSuffix;
    		        a[3] = +posNegDuration > 0;
    		        a[4] = locale;
    		        return substituteTimeAgo.apply(null, a);
    		    }

    		    // This function allows you to set the rounding function for relative time strings
    		    function getSetRelativeTimeRounding(roundingFunction) {
    		        if (roundingFunction === undefined) {
    		            return round;
    		        }
    		        if (typeof roundingFunction === 'function') {
    		            round = roundingFunction;
    		            return true;
    		        }
    		        return false;
    		    }

    		    // This function allows you to set a threshold for relative time strings
    		    function getSetRelativeTimeThreshold(threshold, limit) {
    		        if (thresholds[threshold] === undefined) {
    		            return false;
    		        }
    		        if (limit === undefined) {
    		            return thresholds[threshold];
    		        }
    		        thresholds[threshold] = limit;
    		        if (threshold === 's') {
    		            thresholds.ss = limit - 1;
    		        }
    		        return true;
    		    }

    		    function humanize(argWithSuffix, argThresholds) {
    		        if (!this.isValid()) {
    		            return this.localeData().invalidDate();
    		        }

    		        var withSuffix = false,
    		            th = thresholds,
    		            locale,
    		            output;

    		        if (typeof argWithSuffix === 'object') {
    		            argThresholds = argWithSuffix;
    		            argWithSuffix = false;
    		        }
    		        if (typeof argWithSuffix === 'boolean') {
    		            withSuffix = argWithSuffix;
    		        }
    		        if (typeof argThresholds === 'object') {
    		            th = Object.assign({}, thresholds, argThresholds);
    		            if (argThresholds.s != null && argThresholds.ss == null) {
    		                th.ss = argThresholds.s - 1;
    		            }
    		        }

    		        locale = this.localeData();
    		        output = relativeTime$1(this, !withSuffix, th, locale);

    		        if (withSuffix) {
    		            output = locale.pastFuture(+this, output);
    		        }

    		        return locale.postformat(output);
    		    }

    		    var abs$1 = Math.abs;

    		    function sign(x) {
    		        return (x > 0) - (x < 0) || +x;
    		    }

    		    function toISOString$1() {
    		        // for ISO strings we do not use the normal bubbling rules:
    		        //  * milliseconds bubble up until they become hours
    		        //  * days do not bubble at all
    		        //  * months bubble up until they become years
    		        // This is because there is no context-free conversion between hours and days
    		        // (think of clock changes)
    		        // and also not between days and months (28-31 days per month)
    		        if (!this.isValid()) {
    		            return this.localeData().invalidDate();
    		        }

    		        var seconds = abs$1(this._milliseconds) / 1000,
    		            days = abs$1(this._days),
    		            months = abs$1(this._months),
    		            minutes,
    		            hours,
    		            years,
    		            s,
    		            total = this.asSeconds(),
    		            totalSign,
    		            ymSign,
    		            daysSign,
    		            hmsSign;

    		        if (!total) {
    		            // this is the same as C#'s (Noda) and python (isodate)...
    		            // but not other JS (goog.date)
    		            return 'P0D';
    		        }

    		        // 3600 seconds -> 60 minutes -> 1 hour
    		        minutes = absFloor(seconds / 60);
    		        hours = absFloor(minutes / 60);
    		        seconds %= 60;
    		        minutes %= 60;

    		        // 12 months -> 1 year
    		        years = absFloor(months / 12);
    		        months %= 12;

    		        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
    		        s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';

    		        totalSign = total < 0 ? '-' : '';
    		        ymSign = sign(this._months) !== sign(total) ? '-' : '';
    		        daysSign = sign(this._days) !== sign(total) ? '-' : '';
    		        hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

    		        return (
    		            totalSign +
    		            'P' +
    		            (years ? ymSign + years + 'Y' : '') +
    		            (months ? ymSign + months + 'M' : '') +
    		            (days ? daysSign + days + 'D' : '') +
    		            (hours || minutes || seconds ? 'T' : '') +
    		            (hours ? hmsSign + hours + 'H' : '') +
    		            (minutes ? hmsSign + minutes + 'M' : '') +
    		            (seconds ? hmsSign + s + 'S' : '')
    		        );
    		    }

    		    var proto$2 = Duration.prototype;

    		    proto$2.isValid = isValid$1;
    		    proto$2.abs = abs;
    		    proto$2.add = add$1;
    		    proto$2.subtract = subtract$1;
    		    proto$2.as = as;
    		    proto$2.asMilliseconds = asMilliseconds;
    		    proto$2.asSeconds = asSeconds;
    		    proto$2.asMinutes = asMinutes;
    		    proto$2.asHours = asHours;
    		    proto$2.asDays = asDays;
    		    proto$2.asWeeks = asWeeks;
    		    proto$2.asMonths = asMonths;
    		    proto$2.asQuarters = asQuarters;
    		    proto$2.asYears = asYears;
    		    proto$2.valueOf = valueOf$1;
    		    proto$2._bubble = bubble;
    		    proto$2.clone = clone$1;
    		    proto$2.get = get$2;
    		    proto$2.milliseconds = milliseconds;
    		    proto$2.seconds = seconds;
    		    proto$2.minutes = minutes;
    		    proto$2.hours = hours;
    		    proto$2.days = days;
    		    proto$2.weeks = weeks;
    		    proto$2.months = months;
    		    proto$2.years = years;
    		    proto$2.humanize = humanize;
    		    proto$2.toISOString = toISOString$1;
    		    proto$2.toString = toISOString$1;
    		    proto$2.toJSON = toISOString$1;
    		    proto$2.locale = locale;
    		    proto$2.localeData = localeData;

    		    proto$2.toIsoString = deprecate(
    		        'toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)',
    		        toISOString$1
    		    );
    		    proto$2.lang = lang;

    		    // FORMATTING

    		    addFormatToken('X', 0, 0, 'unix');
    		    addFormatToken('x', 0, 0, 'valueOf');

    		    // PARSING

    		    addRegexToken('x', matchSigned);
    		    addRegexToken('X', matchTimestamp);
    		    addParseToken('X', function (input, array, config) {
    		        config._d = new Date(parseFloat(input) * 1000);
    		    });
    		    addParseToken('x', function (input, array, config) {
    		        config._d = new Date(toInt(input));
    		    });

    		    //! moment.js

    		    hooks.version = '2.30.1';

    		    setHookCallback(createLocal);

    		    hooks.fn = proto;
    		    hooks.min = min;
    		    hooks.max = max;
    		    hooks.now = now;
    		    hooks.utc = createUTC;
    		    hooks.unix = createUnix;
    		    hooks.months = listMonths;
    		    hooks.isDate = isDate;
    		    hooks.locale = getSetGlobalLocale;
    		    hooks.invalid = createInvalid;
    		    hooks.duration = createDuration;
    		    hooks.isMoment = isMoment;
    		    hooks.weekdays = listWeekdays;
    		    hooks.parseZone = createInZone;
    		    hooks.localeData = getLocale;
    		    hooks.isDuration = isDuration;
    		    hooks.monthsShort = listMonthsShort;
    		    hooks.weekdaysMin = listWeekdaysMin;
    		    hooks.defineLocale = defineLocale;
    		    hooks.updateLocale = updateLocale;
    		    hooks.locales = listLocales;
    		    hooks.weekdaysShort = listWeekdaysShort;
    		    hooks.normalizeUnits = normalizeUnits;
    		    hooks.relativeTimeRounding = getSetRelativeTimeRounding;
    		    hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
    		    hooks.calendarFormat = getCalendarFormat;
    		    hooks.prototype = proto;

    		    // currently HTML5 input type only supports 24-hour formats
    		    hooks.HTML5_FMT = {
    		        DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm', // <input type="datetime-local" />
    		        DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss', // <input type="datetime-local" step="1" />
    		        DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS', // <input type="datetime-local" step="0.001" />
    		        DATE: 'YYYY-MM-DD', // <input type="date" />
    		        TIME: 'HH:mm', // <input type="time" />
    		        TIME_SECONDS: 'HH:mm:ss', // <input type="time" step="1" />
    		        TIME_MS: 'HH:mm:ss.SSS', // <input type="time" step="0.001" />
    		        WEEK: 'GGGG-[W]WW', // <input type="week" />
    		        MONTH: 'YYYY-MM', // <input type="month" />
    		    };

    		    return hooks;

    		}))); 
    	} (moment$2));
    	return moment$2.exports;
    }

    var momentExports = requireMoment();
    var moment = /*@__PURE__*/getDefaultExportFromCjs(momentExports);

    function Moment() {
        const time = moment;
        return time;
    }

    const animateCSS = (element, animation, prefix = 'animate__') =>
        // We create a Promise and return it
        new Promise((resolve, reject) => {
          const animationName = `${prefix}${animation}`;
          const node = document.querySelector(element);
      
          node.classList.add(`${prefix}animated`, animationName);
      
          // When the animation ends, we clean the classes and resolve the Promise
          function handleAnimationEnd(event) {
            event.stopPropagation();
            node.classList.remove(`${prefix}animated`, animationName);
            resolve('Animation ended');
          }
      
          node.addEventListener('animationend', handleAnimationEnd, {once: true});
    });

    window.Alpine = module_default;
    module_default.start();
    window.moment = Moment();
    window.animateCSS = animateCSS;
    window.animate = animate;
    window.inView = inView;
    window.scroll = scroll;
    window.hover = hover;
    window.press = press;

    Animete();
    Nav();
    Navbar();
    Banner();

})();
