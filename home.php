<?php
get_template_part('common/header');
// get_template_part('common/banner');

$page = new WP_Query(array(
    'post_type' => 'page',
));
if ($page->have_posts()):
    $page->the_post();
?>
    <?php if (has_post_thumbnail()): ?>
        <div class="post-image mt-18">
            <?php the_post_thumbnail(); ?>
            <div class="overlay">
                <div class="wrapper">
                    <h2 class="text-center text-7xl mt-3"><?php single_post_title(); ?></h2>
                    <p class="text-center mb-3"><?php echo get_the_excerpt(); ?></p>
                </div>
            </div>
        </div>
    <?php else: ?>
        <div class="wrapper mt-22 px-3 md:px-0">
            <h2 class="post-title text-start text-7xl mt-3"><?php single_post_title(); ?></h2>
            <p class="text-start mb-3"><?php echo get_the_excerpt(); ?></p>
            <hr class="styled-separator is-style-wide" aria-hidden="true" />
        </div>
    <?php endif; ?>
<?php wp_reset_postdata(); endif; ?>
<!-- page-content -->
<div class="wrapper mb-4">
    <div class="post">
        <div class="post-content">
            <div class="grid md:grid-cols-3 gap-5">
                <?php if (have_posts()) :
                    while (have_posts()) : the_post(); ?>
                        <div class="card">
                            <a href="<?php the_permalink(); ?>" rel="<?php the_title(); ?>">
                                <img src="<?php the_post_thumbnail_url(); ?>" class="rounded-t-lg" alt="<?php the_title(); ?>">
                            </a>
                            <hr class="styled-separator is-style-wide my-2" aria-hidden="true" />
                            <?php the_title('<h2 class="post-title"><a href="' . esc_url(get_permalink()) . '" rel="' . esc_attr(get_the_title()) . '">', '</a></h2>'); ?>
                            <?php the_content(); ?>
                            <?php wp_link_pages(); ?>
                            <?php edit_post_link(); ?>
                        </div>
                    <?php endwhile; ?>
            </div>
            <?php if (get_next_posts_link() || get_previous_posts_link()): ?>
                <div class="flex justify-between p-5">
                    <?php
                        if (get_next_posts_link()) {
                            next_posts_link();
                        }
                    ?>
                    <?php
                        if (get_previous_posts_link()) {
                            previous_posts_link();
                        }
                    ?>
                </div>
            <?php endif;
                else: ?>
            <h2>404</h2>
            <p>No posts found.</p>
        <?php endif; ?>
        </div>
    </div>
</div>
<?php get_template_part('common/footer'); ?>