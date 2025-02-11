import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';

export default {
    input: 'src/main.js',
    output: [{
        file: 'assets/js/bundle.js',
        format: 'iife'
    },
    {
        file: 'assets/js/bundle.min.js',
        format: 'iife',
        name: 'leadthm',
        plugins: [terser()]
    }],
    plugins: [
        del({ targets: 'dist/*' }),
        copy({
            targets: [
                { src: 'assets/css/*', dest: 'dist/leadthm/assets/css' },
                { src: 'assets/imgs/*', dest: 'dist/leadthm/assets/imgs' },
                { src: 'assets/js/bundle.min.js', dest: 'dist/leadthm/assets/js' },
                { src: 'assets/webfonts/*', dest: 'dist/leadthm/assets/webfonts' },
                { src: 'common/**/*', dest: 'dist/leadthm/common' },
                { src: 'pages/**/*', dest: 'dist/leadthm/pages' },
                { src: 'functions.php', dest: 'dist/leadthm' },
                { src: 'home.php', dest: 'dist/leadthm' },
                { src: 'index.php', dest: 'dist/leadthm' },
                { src: 'page-home.php', dest: 'dist/leadthm' },
                { src: 'page.php', dest: 'dist/leadthm' },
                { src: 'screenshot.png', dest: 'dist/leadthm' },
                { src: 'single.php', dest: 'dist/leadthm' },
                { src: 'style.css', dest: 'dist/leadthm' },
                { src: 'theme.json', dest: 'dist/leadthm' },
            ]
        }),
        commonjs(),
        nodeResolve(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            __buildDate__: () => JSON.stringify(new Date()),
            __buildVersion: 15,
            preventAssignment: true
        })
    ]
};
