<?php 
get_template_part('common/header');
// get_template_part('common/banner');
get_template_part('common/hero');
?>
<div class="wrapper">
    <?php if ( have_posts() ) : 
        while ( have_posts() ) : the_post(); ?>
        <div class="post">
            <div class="px-4">
                <h2 class="post-title text-center text-7xl mt-9"><?php the_title(); ?></h2>
                <p class="text-center mb-9 text-xl"><?php echo get_the_excerpt(); ?></p>
            </div>
            <div class="post-content">
                <?php the_content(); ?>
            </div>
        </div>
    <?php 
        endwhile;
        endif;
    ?>
</div>
<?php get_template_part('common/footer'); ?>