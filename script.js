function parseExpression(program){
    program = skipSpace(program)
    let match, expr;
    if(match = /^"([^"]*)"/.exec(program)){
        expr = {type: "value", value: match[1]};
    }else if(match = /^\d+\b/.exec(program)){
        expr = {type: "value", value: Number(match[0])};
    }else if(match = /^'\D+\b'/.exec(program)){
        expr = {type: "value", value: String(match[0])};
    }else if(match = /^[^\s(),"]+/.exec(program)){
        expr = {type: "word", name: match[0]};
    }else{
        throw new SyntaxError(`unexpectable syntax ${program}`)
    }

    return parseApply(expr, program.slice(match[0].length))
}

function skipSpace(string) {
    const first = string.search(/\S/);

    if(first === -1) return ''
    return string.slice(first)
}


function parseApply(expr, program){
    program = skipSpace(program);
    if(program[0] !== "(") return {expr: expr, rest: program};

    program = skipSpace(program.slice(1));
    expr = {type: "apply", operator: expr, args: []};

    while(program[0] !== ")"){
        const arg = parseExpression(program);
        expr.args.push(arg.expr);
        program = skipSpace(arg.rest);

        if(program[0] === ",") program = skipSpace(program.slice(1));
        else if(program[0] !== ")") throw new SyntaxError("Expected ',' or ')'")
    }

    return parseApply(expr, program.slice(1));
}

function parse(program){
    const result = parseExpression(program);
    
    if(skipSpace(result.rest).length > 0) throw new SyntaxError("Unexpect text after program")
    
    return result.expr;
}

function evaluate(expr, env){
    switch(expr.type) {
        case "value":   {
            return expr.value;
        }
        case "word": {
            if(expr.name in env) return env[expr.name];
            else throw new ReferenceError(`Unexpectable variable: ${expr.name}`)
        }
        case "apply": {
            if(expr.operator.type === "word" && expr.operator.name in specialForms){
                return specialForms[expr.operator.name](expr.args, env)
            }
            const op = evaluate(expr.operator, env);
            if(typeof op !== "function"){
                throw new TypeError("Application is not a function")
            }

            return op.apply(null, expr.args.map((arg) => {
                return evaluate(arg, env)
            }))
        }
    }
}

const specialForms = {};

specialForms["if"] = function(args, env) {
    if(args.length !== 3) throw new SyntaxError("Wrong number of arguments for if")

    if(evaluate(args[0], env) !== false) return evaluate(args[1], env)
    else return evaluate(args[2], env)
}

specialForms["while"] = function(args, env) {
    if(args.length !== 2) throw new SyntaxError("Wrong number of arguments for if")

    while(evaluate(args[0], env) !== false){
        evaluate(args[1], env)
    }
    return false
}

specialForms["do"] = function(args, env) {
    let value = false;
    
    args.forEach(arg => {
        value = evaluate(arg, env)
    })
    return value
}

specialForms["define"] = function(args, env) {
    if(args.length !== 2 || args[0].type !== "word") throw new SyntaxError("Bad use of define");
    const value = evaluate(args[1], env);

    env[args[0].name] = value;
    return value
}

specialForms["fun"] = function(args, env){
    if(!args.length) throw new SyntaxError("Function need body")

    function name(expr) {
        if(expr.type !== "word") throw new SyntaxError("Argument names need to be with 'word' type")

        return expr.name;
    }

    const argNames = args.slice(0, args.length - 1).map(name);
    const body = args[args.length - 1];

    return function() {
        if(arguments.length !== argNames.length) throw new TypeError("Wrong number of arguments")
        const localEnv = Object.create(env);

        for(let i = 0; i < arguments.length; i++){
            localEnv[argNames[i]] = arguments[i];
        }

        return evaluate(body, localEnv)
    }
}

//env

const topEnv = {}

topEnv["true"] = true;
topEnv["false"] = false;


["+", "-", "*", "/", "==", "<", ">"].forEach(op => {
    topEnv[op] = new Function("a, b", `return a ${op} b`)
})

topEnv["print"] = function(value) {
    return `Output >>>>>>>>>>>>> ${value}`
}

function run(){
    const env = Object.create(topEnv);
    const program = Array.prototype.slice.call(arguments, 0).join("\n");

    return evaluate(parse(program), env);
}

console.log(`
run("do(define(total, 0),",
        "   define(count, 1),",
        "   while(<(count, 11),",
        "         do(define(total, +(total, count)),",
        "            define(count, +(count, 1)))),",
        "   print(total))")
        `);

console.log(run("do(define(total, 0),",
                "   define(count, 1),",
                "   while(<(count, 11),",
                "         do(define(total, +(total, count)),",
                "            define(count, +(count, 1)))),",
                "   print(total))")
                )


console.log(`
            run("do(define(plusOne, fun(a, +(a, 1))),",
            "   print(plusOne(10)))")
            `);

console.log(run("do(define(plusOne, fun(a, +(a, 1))),",
                "   print(plusOne(10)))")
                )


console.log(`
            run("do(define(pow, fun(base, exp,",
            "   print(plusOne(10)))",
            "   print(plusOne(10)))",
            "   print(plusOne(10)))",
            "   print(plusOne(10)))")
            `);
    
console.log(run("do(define(pow, fun(base, exp,",
                    "   if(==(exp, 0),",
                    "   1,",
                    "   *(base, pow(base, -(exp, 1)))))),",
                    "   print(pow(2, 10)))"
                )
            )


console.log(`
            run("do(define(hereItIs, 'HELLO WORLD',",
            "   print(hereItIs)")
            `);

console.log(run("do(define(hereItIs, 'HELLO WORLD'),",
                "   print(hereItIs))")
                )

