<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php wp_title( '|', true, 'right' ); ?><?php bloginfo('name'); ?></title>
    <meta name="description" content="<?php bloginfo('description'); ?>">
    <?php wp_head(); ?>
</head>
<body class="bg-gray-100 dark:bg-gray-700 dark:text-white">
    <header class="header">
        <div class="wrapper">
            <div class="navbar">
                <div class="title">
                    <a href="/">
                        <h1 class="!text-3xl font-bold">
                            <span class="text-amber-400 dark:text-amber-600">i</span><span class="text-violet-100 dark:text-violet-500">Leads</span><span class="text-yellow-400 dark:text-red-600">Pro</span>
                        </h1>
                        <h2 class="description">Leads Generations Experts</h2>
                    </a>
                </div>
                <?php get_template_part('common/navbar'); ?>
            </div>
        </div>
    </header>