<?php 
get_template_part('common/header');
// get_template_part('common/banner');
?>
<div class="wrapper p-[15px] mt-18">
    <?php if ( have_posts() ) : 
        while ( have_posts() ) : the_post(); ?>
        <div class="post">
            <h2 class="post-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
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