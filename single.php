<?php
get_template_part('common/header');
// get_template_part('common/banner');
?>
<?php if (have_posts()) :
    while (have_posts()) : the_post(); ?>
        <?php if (has_post_thumbnail()): ?>
            <div class="post-image mt-18">
                <?php the_post_thumbnail(); ?>
                <div class="overlay">
                    <div class="wrapper">
                        <h2 class="text-center text-7xl mt-3"><?php the_title(); ?></h2>
                        <p class="text-center mb-3"><?php echo get_the_excerpt(); ?></p>
                    </div>
                </div>
            </div>
        <?php else: ?>
            <div class="wrapper mt-22">
                <h2 class="post-title text-start text-7xl mt-3"><?php the_title(); ?></h2>
                <p class="text-start mb-3"><?php echo get_the_excerpt(); ?></p>
                <hr class="styled-separator is-style-wide" aria-hidden="true" />
            </div>
        <?php endif; ?>
        <div class="wrapper mb-4">
            <div class="post">
                <div class="post-content py-2">
                    <?php the_content(); ?>
                </div>
            </div>
        </div>
<?php
    endwhile;
endif;
?>
<?php get_template_part('common/footer'); ?>