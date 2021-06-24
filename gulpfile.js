const gulp = require('gulp');
const gulpPug = require('gulp-pug');
const gulpPlumber = require('gulp-plumber');
const gulpSass = require('gulp-sass');
const gulpAutoprefixer = require('gulp-autoprefixer');
const gulpCleanCss = require('gulp-clean-css');
const gulpSourcemaps = require('gulp-sourcemaps');
const gulpBabel = require('gulp-babel');
const gulpUglify = require('gulp-uglify');
const gulpImagemin = require('gulp-imagemin');
const del = require('del');
const browserSync = require('browser-sync').create();
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const gulpWebp = require('gulp-webp');
const gulpWebpHtml = require('gulp-xv-webp-html');
const gulpWebpcss = require('gulp-webpcss');
const gulpConcat = require('gulp-concat');
const gulpIf = require('gulp-if');
const fs = require('fs');
const spriteSmith = require('gulp.spritesmith');
const buffer = require('vinyl-buffer');
const merge = require('merge-stream');
const gm = require('gulp-gm'); //не используется
// const Glob = require("glob").Glob;

let isBuildFlag = false;

function clean() {
	return del('dist');
}
function fonts() {
	return gulp.src('dev/static/fonts/**/*.ttf')
		.pipe(ttf2woff({ clone: true }))
		.pipe(ttf2woff2({ clone: true }))
		.pipe(gulp.dest('dist/static/fonts'));
}
function pugToHtml() {
	return gulp.src('dev/pug/index.pug')
		.pipe(gulpPlumber())
		.pipe(gulpPug({
			locals: {
				nav: JSON.parse(fs.readFileSync('./data/navigation.json', 'utf8')),
				content: JSON.parse(fs.readFileSync('./data/content.json', 'utf8')),
				indexSlider: JSON.parse(fs.readFileSync('./data/index/slider.json', 'utf8')),
				productPreview: JSON.parse(fs.readFileSync('./data/modules/product-preview.json', 'utf8')),
				popularBrands: JSON.parse(fs.readFileSync('./data/index/popular-brands.json', 'utf8')),
			},
			pretty: true
		}))
		// .pipe(gulpWebpHtml(['.jpg', '.png']))
		.pipe(gulpPlumber.stop())
		.pipe(gulp.dest('dist'));
}
function scssTocss() {
	return gulp.src('dev/static/styles/styles.scss')
		.pipe(gulpPlumber())
		.pipe(gulpSourcemaps.init())
		.pipe(gulpSass())
		.pipe(gulpCleanCss({ level: 2 }))
		.pipe(gulpAutoprefixer())
		.pipe(gulpWebpcss({
			baseClass: '.webp1',
			replace_from: /\.(png|jpg|jpeg)/,
			replace_to: '.webp'
		}))
		.pipe(gulpSourcemaps.write())
		.pipe(gulpPlumber.stop())
		.pipe(browserSync.stream())
		.pipe(gulp.dest('dist/static/css'));
}
// function copyJQuery() {
// 	return gulp.src(['dev/static/js/libs/jquery-3.6.0.min.js'])
// 		.pipe(gulp.dest('dist/static/js/libs'));
// }

function copyVideo() {
	return gulp.src('dev/static/video/*.*')
		.pipe(gulp.dest('dist/static/video/'));
}

function libs() {
	// return gulp.src(['node_modules/slick-carousel/slick/slick.min.js', 'node_modules/svg4everybody/dist/svg4everybody.min.js'])
	return gulp.src(['node_modules/svg4everybody/dist/svg4everybody.min.js', 'dev/static/js/libs/TweenMax.js', 'dev/static/js/libs/ScrollMagic.js', 'dev/static/js/libs/animation.gsap.js'])
		.pipe(gulpConcat('libs.js'))
		.pipe(gulp.dest('dist/static/js/libs'));
}
function script() {
	return gulp.src('dev/static/js/main.js')
		.pipe(gulpPlumber())
		.pipe(gulpSourcemaps.init())
		.pipe(gulpBabel({
			presets: ['@babel/env']
		}))
		.pipe(gulpIf(isBuildFlag, gulpUglify()))
		.pipe(gulpSourcemaps.write())
		.pipe(gulpPlumber.stop())
		.pipe(browserSync.stream())
		.pipe(gulp.dest('dist/static/js'));
}
function images() {
	return gulp.src(['dev/static/images/**/*.{jpg,gif,png,svg}', '!dev/static/images/svgsprite/*', '!dev/static/images/pngsprite/*'])
		.pipe(gulpImagemin([
			gulpImagemin.gifsicle({ interlaced: true }),
			gulpImagemin.mozjpeg({ quality: 75, progressive: true }),
			gulpImagemin.optipng({ optimizationLevel: 5 }),
			gulpImagemin.svgo({
				plugins: [
					{ removeViewBox: true },
					{ cleanupIDs: false }
				]
			})
		]))
		.pipe(gulp.dest('dist/static/images'));
}

function imagesWebp() {
	return gulp.src(['dev/static/images/**/*.{jpg,gif,png,svg}', '!dev/static/images/svgsprite/*', '!dev/static/images/pngsprite/*', '!dev/static/images/imgsprite/*'])
		.pipe(gulpWebp({
			quality: 70
		}))
		.pipe(gulp.dest('dist/static/images'));
}

function svgSpriteBuild() {
	return gulp.src('dev/static/images/svgsprite/*.svg')
		// minify svg
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		// remove all fill, style and stroke declarations in out shapes
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
			},
			parserOptions: { xmlMode: true }
		}))
		// cheerio plugin create unnecessary string '&gt;', so replace it.
		.pipe(replace('&gt;', '>'))
		// build svg sprite
		.pipe(svgSprite({
			mode: {
				symbol: {
					sprite: "sprite.svg"
				}
			}
		}))
		.pipe(gulp.dest('dist/static/images/svgsprite'));
}
function pngSpriteBuild() {
	let spriteData = gulp.src('dev/static/images/pngsprite/*.png')
		.pipe(spriteSmith({
			imgName: 'sprite.png',
			cssName: '_sprite.scss',
			algorithmOpts: {
				sort: false
			},
			algorithm: 'top-down'
		}));
	// Pipe image stream through image optimizer and onto disk
	let imgStream = spriteData.img
		// DEV: We must buffer our stream into a Buffer for `imagemin`
		.pipe(buffer())
		.pipe(gulpImagemin())
		.pipe(gulp.dest('dist/static/images/pngsprite/'));

	// Pipe CSS stream through CSS optimizer and onto disk
	let scssStream = spriteData.css
		.pipe(gulp.dest('dev/static/styles/libs/'));

	// Return a merged stream to handle both `end` events
	return merge(imgStream, scssStream);
}

function setMode(isBuild) {
	return cb => {
		isBuildFlag = isBuild;
		cb();
	}
}

function watch() {
	browserSync.init({
		server: {
			baseDir: "dist"
		}
	});

	gulp.watch("dev/pug/**/*.pug", pugToHtml);
	gulp.watch(["dev/static/images/**/*.{jpg,gif,png,svg}", "!dev/static/images/svgsprite/*"], images);
	// gulp.watch(["dev/static/images/**/*.{jpg,gif,png,svg}", "!dev/static/images/svgsprite/*", "!dev/static/images/pngsprite/*", "!dev/static/images/imgsprite/*"], imagesWebp);
	gulp.watch("dev/static/images/svgsprite/*.svg", svgSpriteBuild);
	gulp.watch("dev/static/images/pngsprite/*.png", pngSpriteBuild);
	gulp.watch("dev/static/js/main.js", script);
	gulp.watch("dev/static/styles/**/*.scss", scssTocss);
	gulp.watch("dist/*.html").on('change', browserSync.reload);
}

const dev = gulp.parallel(fonts, images, svgSpriteBuild, pngSpriteBuild, pugToHtml, scssTocss, libs, script, copyVideo);

exports.default = gulp.series(clean, dev, watch);
exports.build = gulp.series(clean, setMode(true), dev);