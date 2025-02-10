<?php
get_template_part('common/header');
get_template_part('common/banner');
?>
<section class="features">
  <div class="container">
    <div class="heading">
      <h2>Why Choose Us</h2>
      <p>Our platform offers the best features to enhance your productivity.</p>
    </div>
    <div class="contents">
      <div id="w1" class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 8v4l3 3m6 3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3>Fast Performance</h3>
        <p>Experience blazing fast speeds with our advanced technology.</p>
      </div>
      <div id="w2" class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3>Secure</h3>
        <p>Your data is safe with our end-to-end encryption.</p>
      </div>
      <div id="w3" class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 8c-4.418 0-8 1.79-8 4m8-4c4.418 0 8 1.79 8 4m-8-4v4m0 4h.01"></path>
          </svg>
        </div>
        <h3>24/7 Support</h3>
        <p>We are here to help anytime you need assistance.</p>
      </div>
    </div>
  </div>
</section>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    inView('#w1', () =>
      animateCSS('#w1', 'zoomIn').then(
        () => animateCSS('#w2', 'zoomIn').then(
          () => animateCSS('#w3', 'zoomIn'))
      ));
  });
</script>
<section class="features-2">
  <div class="container">
    <div class="heading">
      <h2>Explore Our Product Features</h2>
      <p>Discover how our tools can transform your workflow and productivity.</p>
    </div>
    <div class="contents">
      <!-- Feature Card 1 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3v4.5m4.5-4.5v4.5M3 8.25h18M3 12h18m-6.75 4.5v3.75M9.75 16.5v3.75" />
          </svg>
        </div>
        <h3>Seamless Integration</h3>
        <p>Integrate our tools effortlessly into your existing workflow with minimal effort.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Feature Card 2 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16v4m8-4v4M3 8h18m-2.22 10.69A9 9 0 1114.31 4.22" />
          </svg>
        </div>
        <h3>Advanced Analytics</h3>
        <p>Get insights into your business with real-time data and actionable analytics.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Feature Card 3 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3a2.25 2.25 0 104.5 0M4.5 9h15M4.5 12h15m-8.25 6v3.75" />
          </svg>
        </div>
        <h3>Customizable Solutions</h3>
        <p>Tailor our products to suit your unique needs with flexible customization options.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Feature Card 4 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m9-9H3" />
          </svg>
        </div>
        <h3>Scalable Infrastructure</h3>
        <p>Easily scale your operations as your business grows with our robust platform.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Feature Card 5 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c5.25 0 9 2.35 9 7.5S12 21 12 21s-9-5.75-9-10.5S6.75 3 12 3z" />
          </svg>
        </div>
        <h3>Enhanced Security</h3>
        <p>Rest assured with top-notch security measures to protect your data.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Feature Card 6 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 4h9M4.5 20.25h15M8.25 9.75h7.5m-7.5 3.75h7.5m-7.5 3.75h7.5" />
          </svg>
        </div>
        <h3>User-Friendly Interface</h3>
        <p>Navigate with ease using our simple, intuitive design.</p>
        <a href="#">Learn More →</a>
      </div>
    </div>
  </div>
</section>


<section class="features-2">
  <div class="container">
    <div class="heading">
      <h2>Our Services</h2>
      <p>We provide a wide range of services to meet all your needs. Explore how we can help you grow and succeed.</p>
    </div>
    <div class="contents">
      <!-- Service Card 1 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h11M9 21V3M19 14l4-4m0 0l-4-4m4 4H9" />
          </svg>
        </div>
        <h3>Consulting Services</h3>
        <p>Leverage our expert advice to make informed business decisions and drive success.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 2 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-4.418 0-8 1.79-8 4m16 0c0-2.21-3.582-4-8-4s-8 1.79-8 4m16 0a3.99 3.99 0 01-3.208 3.871M4 18h16M4 21h16" />
          </svg>
        </div>
        <h3>Cloud Solutions</h3>
        <p>Seamlessly integrate cloud-based solutions to enhance flexibility and efficiency.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 3 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-3.351 0-6 2.462-6 5.5s2.649 5.5 6 5.5 6-2.462 6-5.5S15.351 8 12 8zM12 1v7m0 10v4" />
          </svg>
        </div>
        <h3>Software Development</h3>
        <p>Build scalable and robust software tailored to your business needs.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 4 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6h6v6m1.5-11a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
          </svg>
        </div>
        <h3>IT Support</h3>
        <p>Get expert IT support to ensure your systems run smoothly and securely.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 5 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.121 12.121A3 3 0 0112 12m0 0a3 3 0 016.879.121M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </div>
        <h3>Cybersecurity</h3>
        <p>Safeguard your business with industry-leading cybersecurity solutions.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 6 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75V3m6 4.5v3M6 7.5v3m0 7.5h12m-6-3.75v3m3-4.5v3" />
          </svg>
        </div>
        <h3>Training & Workshops</h3>
        <p>Empower your team with hands-on training sessions and professional workshops.</p>
        <a href="#">Learn More →</a>
      </div>
    </div>
  </div>
</section>

<section class="features-3">
  <div class="container">
    <div class="heading">
      <h2>Our Digital Marketing Services</h2>
      <p>We offer comprehensive digital marketing services to help your business grow and succeed in the online world. Explore how we can assist you in reaching your marketing goals.</p>
    </div>
    <div class="contents">
      <!-- Service Card 1 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h11M9 21V3M19 14l4-4m0 0l-4-4m4 4H9" />
          </svg>
        </div>
        <h3>SEO Optimization</h3>
        <p>Boost your online visibility with our expert SEO services and drive organic traffic to your website.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 2 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-4.418 0-8 1.79-8 4m16 0c0-2.21-3.582-4-8-4s-8 1.79-8 4m16 0a3.99 3.99 0 01-3.208 3.871M4 18h16M4 21h16" />
          </svg>
        </div>
        <h3>PPC Advertising</h3>
        <p>Maximize your ROI with targeted PPC campaigns on Google and social platforms.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 3 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-3.351 0-6 2.462-6 5.5s2.649 5.5 6 5.5 6-2.462 6-5.5S15.351 8 12 8zM12 1v7m0 10v4" />
          </svg>
        </div>
        <h3>Social Media Marketing</h3>
        <p>Create and manage impactful social media campaigns to increase brand awareness and engagement.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 4 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-6h6v6m1.5-11a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
          </svg>
        </div>
        <h3>Email Marketing</h3>
        <p>Engage with your audience directly via targeted email campaigns designed to convert.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 5 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.121 12.121A3 3 0 0112 12m0 0a3 3 0 016.879.121M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </div>
        <h3>Content Marketing</h3>
        <p>Create high-quality content that attracts and converts your target audience into loyal customers.</p>
        <a href="#">Learn More →</a>
      </div>
      <!-- Service Card 6 -->
      <div class="feature">
        <div class="icon">
          <svg class="w-12 h-12 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75V3m6 4.5v3M6 7.5v3m0 7.5h12m-6-3.75v3m3-4.5v3" />
          </svg>
        </div>
        <h3>Digital Strategy & Consulting</h3>
        <p>Develop a comprehensive digital marketing strategy to ensure sustained growth and success online.</p>
        <a href="#">Learn More →</a>
      </div>
    </div>
  </div>
</section>


<section class="feedbacks">
  <div class="container">
    <div class="heading">
      <h2>What Our Customers Say</h2>
      <p class="mt-4 text-gray-600 dark:text-gray-300">See how our solutions have made a difference for businesses like yours.</p>
    </div>
    <div class="contents">
      <!-- Feedback Card 1 -->
      <div class="feature">
        <div class="heading">
          <img src="https://flowbite.com/docs/images/people/profile-picture-1.jpg" alt="Customer 1">
          <div class="content">
            <h3>Jane Doe</h3>
            <p>CEO, TechCorp</p>
          </div>
        </div>
        <p>"This product has completely transformed our workflow. The ease of use and incredible support make it unbeatable."</p>
        <div class="flex">
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
        </div>
      </div>
      <!-- Feedback Card 2 -->
      <div class="feature">
        <div class="heading">
          <img src="https://flowbite.com/docs/images/people/profile-picture-2.jpg" alt="Customer 2">
          <div class="content">
            <h3>John Smith</h3>
            <p>Manager, FinTech Inc.</p>
          </div>
        </div>
        <p>"Incredible! The results exceeded our expectations, and we couldn't be happier. Highly recommended."</p>
        <div class="flex">
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-gray-300 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
        </div>
      </div>
      <!-- Feedback Card 3 -->
      <div class="feature">
        <div class="heading">
          <img src="https://flowbite.com/docs/images/people/profile-picture-3.jpg" alt="Customer 3">
          <div class="content">
            <h3>Emily Brown</h3>
            <p>Founder, Creative Agency</p>
          </div>
        </div>
        <p>"The level of professionalism and quality is unmatched. Our customers are happier than ever!"</p>
        <div class="flex">
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
          <svg class="w-5 h-5 text-gray-300 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09L5.5 12.4 1 8.36l6.314-.573L10 2l2.686 5.787L19 8.36l-4.5 4.04.378 5.69L10 15z"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>
</section>


<section class="prices">
  <div class="container">
    <div class="heading">
      <h2>Compare Our Pricing Plans</h2>
      <p>Choose the plan that best suits your needs and budget.</p>
    </div>
    <div class="contents">
      <!-- Basic Plan -->
      <div class="plan">
        <h3>Basic</h3>
        <p>Ideal for individuals starting out.</p>
        <div class="amount">
          <span class="digit">$19</span>
          <span>/ month</span>
        </div>
        <ul>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Access to basic features
          </li>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Community support
          </li>
          <li>
            <svg class="w-5 h-5 text-red-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9 12h6M9 16h6M9 8h6M7 8v8m6-12v2M9 8h6m2-2H5m-3 5h16"></path>
            </svg>
            Limited customization
          </li>
        </ul>
        <a href="#">
          Get Started
        </a>
      </div>

      <!-- Pro Plan -->
      <div class="pro-plan">
        <h3>Pro</h3>
        <p>Perfect for growing teams.</p>
        <div class="amount">
          <span class="digit">$49</span>
          <span>/ month</span>
        </div>
        <ul>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Everything in Basic
          </li>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Advanced analytics
          </li>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Customizable workflows
          </li>
        </ul>
        <a href="#">
          Get Pro
        </a>
      </div>

      <!-- Enterprise Plan -->
      <div class="plan">
        <h3>Enterprise</h3>
        <p>Advanced features for businesses.</p>
        <div class="amount">
          <span class="digit">Custom</span>
          <span>pricing</span>
        </div>
        <ul>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Everything in Pro
          </li>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Dedicated account manager
          </li>
          <li>
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414L8.414 15H7v-1.414l8.293-8.293a1 1 0 011.414 0z"></path>
              <path d="M10.707 3.293a1 1 0 00-1.414 0L3 9.586V10h.414l6.293-6.293a1 1 0 011.414 0z"></path>
            </svg>
            Custom integrations
          </li>
        </ul>
        <a href="#" class="pro">
          Contact Sales
        </a>
      </div>
    </div>
  </div>
</section>

<section class="articles">
  <div class="container">
    <div class="heading">
      <h2>Latest Articles</h2>
      <p>Stay updated with our latest insights and stories.</p>
    </div>
    <div class="contents">
      <!-- Article 1 -->
      <div class="card">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 1" class="rounded-t-lg">
        <div class="card-body">
          <h3>How to Boost Your Productivity</h3>
          <p>Learn practical strategies to enhance your productivity and get more done in less time.</p>
          <a href="#">Read More →</a>
        </div>
      </div>
      <!-- Article 2 -->
      <div class="card">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 2" class="rounded-t-lg">
        <div class="card-body">
          <h3>Top 5 Tools for Remote Teams</h3>
          <p>Discover the best tools to keep your remote team connected and productive.</p>
          <a href="#">Read More →</a>
        </div>
      </div>
      <!-- Article 3 -->
      <div class="card">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 3" class="rounded-t-lg">
        <div class="card-body">
          <h3>The Future of AI in Business</h3>
          <p>Explore how artificial intelligence is reshaping industries and driving innovation.</p>
          <a href="#">Read More →</a>
        </div>
      </div>
    </div>
  </div>
</section>


<section class="page">
  <div class="container">
    <!-- Article Header -->
    <div class="heading">
      <h1>How to Boost Your Productivity</h1>
      <p>Published on <span class="font-medium">January 20, 2025</span> by <span class="font-medium text-blue-600">Jane Doe</span></p>
    </div>

    <!-- Feature Image -->
    <div class="mb-8">
      <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Feature Image" class="rounded-lg shadow-md">
    </div>

    <!-- Article Content -->
    <div class="content prose prose-lg">
      <p>
        Productivity is one of the most important factors that determine success in both personal and professional life.
        Yet, many people struggle to maintain high levels of productivity. In this article, we'll explore proven strategies
        to boost your productivity and achieve your goals.
      </p>
      <h2>Why Productivity Matters</h2>
      <p>
        Productivity allows you to accomplish more in less time, freeing you up for the things that truly matter.
        It’s not just about working harder but working smarter. Here are some key benefits of improved productivity:
      </p>
      <ul>
        <li>Better time management and reduced stress</li>
        <li>Increased focus on important tasks</li>
        <li>Improved performance and results</li>
      </ul>
      <h2>Proven Strategies for Productivity</h2>
      <p>
        From breaking tasks into smaller chunks to eliminating distractions, here are some actionable strategies to help
        you stay on top of your game:
      </p>
      <p>
        <strong>1. Time Blocking:</strong> Allocate specific time slots for different activities and stick to the schedule.
        This minimizes multitasking and helps maintain focus.
      </p>
      <p>
        <strong>2. The 2-Minute Rule:</strong> If a task takes less than two minutes, do it immediately rather than
        procrastinating.
      </p>
      <p>Remember, consistency is key when it comes to productivity. Implement these tips, and watch your results improve!</p>
    </div>

    <!-- Related Articles / Actions -->
    <div class="related">
      <h3>Related Articles</h3>
      <div class="container">
        <!-- Related Article 1 -->
        <a href="#" class="link">
          <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 1" class="w-24 h-24 rounded-lg mr-4">
          <div>
            <h4>Time Management Tips for Busy Professionals</h4>
            <p>Learn how to optimize your schedule and achieve more with less stress.</p>
          </div>
        </a>
        <!-- Related Article 2 -->
        <a href="#" class="link">
          <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 2" class="w-24 h-24 rounded-lg mr-4">
          <div>
            <h4>5 Tools to Boost Team Productivity</h4>
            <p>Explore the top productivity tools that can help your team work smarter.</p>
          </div>
        </a>
        <!-- Related Article 3 -->
        <a href="#" class="link">
          <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 2" class="w-24 h-24 rounded-lg mr-4">
          <div>
            <h4>5 Tools to Boost Team Productivity</h4>
            <p>Explore the top productivity tools that can help your team work smarter.</p>
          </div>
        </a>
        <!-- Related Article 4 -->
        <a href="#" class="link">
          <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 2" class="w-24 h-24 rounded-lg mr-4">
          <div>
            <h4>5 Tools to Boost Team Productivity</h4>
            <p>Explore the top productivity tools that can help your team work smarter.</p>
          </div>
        </a>
      </div>
    </div>
  </div>
</section>


<section class="call-to-action">
  <div class="container">
    <div class="body">
      <h2>Experience it Yourself</h2>
      <p>Schedule a personalized demo today and see how our solution can work for you.</p>
    </div>
    <div class="btn-group">
      <!-- Demo Call-to-Action Button -->
      <a href="#demo-form" class="button-1">
        Request a Demo
      </a>
      <!-- Contact Form Link -->
      <a href="#contact" class="button-2">
        Contact Sales
      </a>
    </div>
  </div>
</section>


<section class="contact-form">
  <div class="container">
    <div class="heading">
      <h2>Request a Free Demo</h2>
      <p>Fill out the form below, and our team will contact you shortly to schedule your personalized demo.</p>
    </div>
    <!-- Demo Form -->
    <form action="#" method="POST">
      <div class="grid gap-6 mb-6 md:grid-cols-2">
        <!-- Name -->
        <div>
          <label for="name">Full Name</label>
          <input type="text" id="name" name="name" class="form-control" placeholder="John Doe" required>
        </div>
        <!-- Email -->
        <div>
          <label for="email">Email Address</label>
          <input type="email" id="email" name="email" class="form-control" placeholder="you@example.com" required>
        </div>
      </div>
      <!-- Company -->
      <div class="mb-6">
        <label for="company">Company Name</label>
        <input type="text" id="company" name="company" class="form-control" placeholder="Your Company" required>
      </div>
      <!-- Message -->
      <div class="mb-6">
        <label for="message">Additional Information</label>
        <textarea id="message" name="message" rows="4" placeholder="Let us know how we can help"></textarea>
      </div>
      <!-- Submit Button -->
      <div class="text-center">
        <button type="submit">
          Submit Request
        </button>
      </div>
    </form>
  </div>
</section>


<section class="single-page">
  <div class="container">
    <div class="content-group">
      <!-- Main Content -->
      <div class="main-content">
        <!-- Article Header -->
        <div class="article-header">
          <h1>How to Boost Your Productivity</h1>
          <p class="meta">Published on <span class="font-medium">January 20, 2025</span> by <span class="highlight">Jane Doe</span></p>
        </div>

        <!-- Feature Image -->
        <div class="mb-8">
          <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Feature Image" class="rounded-lg shadow-md">
        </div>

        <!-- Article Content -->
        <div class="article-container">
          <p>
            Productivity is one of the most important factors that determine success in both personal and professional life.
            Yet, many people struggle to maintain high levels of productivity. In this article, we'll explore proven strategies
            to boost your productivity and achieve your goals.
          </p>
          <h2>Why Productivity Matters</h2>
          <p>
            Productivity allows you to accomplish more in less time, freeing you up for the things that truly matter.
            It’s not just about working harder but working smarter. Here are some key benefits of improved productivity:
          </p>
          <ul>
            <li>Better time management and reduced stress</li>
            <li>Increased focus on important tasks</li>
            <li>Improved performance and results</li>
          </ul>
          <h2>Proven Strategies for Productivity</h2>
          <p>
            From breaking tasks into smaller chunks to eliminating distractions, here are some actionable strategies to help
            you stay on top of your game:
          </p>
          <p>
            <strong>1. Time Blocking:</strong> Allocate specific time slots for different activities and stick to the schedule.
            This minimizes multitasking and helps maintain focus.
          </p>
          <p>
            <strong>2. The 2-Minute Rule:</strong> If a task takes less than two minutes, do it immediately rather than
            procrastinating.
          </p>
          <p>Remember, consistency is key when it comes to productivity. Implement these tips, and watch your results improve!</p>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="sidebar">
        <!-- Author Info -->
        <div class="widget">
          <div class="flex items-center mb-4">
            <img class="w-16 h-16 rounded-full" src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Author Image">
            <div class="ml-4">
              <h3 class="text-lg font-bold text-gray-800 dark:text-white">Jane Doe</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">Productivity Expert</p>
            </div>
          </div>
          <p class="text-gray-600 dark:text-gray-300">Jane has over 10 years of experience helping individuals and organizations boost productivity and achieve their goals.</p>
          <a href="#" class="text-blue-600 hover:underline font-medium mt-4 block dark:text-blue-400">Read More About Jane →</a>
        </div>

        <!-- Related Articles -->
        <div class="widget">
          <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Related Articles</h3>
          <ul class="space-y-4">
            <li>
              <a href="#" class="flex items-center space-x-4 hover:underline dark:hover:text-blue-400">
                <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 1" class="w-16 h-16 rounded-lg">
                <span class="text-gray-800 font-medium dark:text-gray-300">Time Management Tips for Busy Professionals</span>
              </a>
            </li>
            <li>
              <a href="#" class="flex items-center space-x-4 hover:underline dark:hover:text-blue-400">
                <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Article 2" class="w-16 h-16 rounded-lg">
                <span class="text-gray-800 font-medium dark:text-gray-300">5 Tools to Boost Team Productivity</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- Newsletter Subscription -->
        <div class="widget">
          <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Subscribe to Our Newsletter</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">Get the latest tips and insights delivered straight to your inbox.</p>
          <form action="#" method="POST">
            <input type="email" name="email" id="email" placeholder="Your Email Address" required
              class="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300">
            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600">
              Subscribe
            </button>
          </form>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="bg-gray-50 py-16 dark:bg-gray-800">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Search Bar -->
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-extrabold text-gray-800 dark:text-white mb-4">Search for Articles</h1>
      <p class="text-gray-600 dark:text-gray-300 mb-6">Find the best content on productivity, management, and more!</p>
      <div class="relative">
        <input type="text" id="search" placeholder="Search for articles..." class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:focus:ring-blue-400 dark:focus:border-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm8 0l3 3-3-3"></path>
        </svg>
      </div>
    </div>

    <!-- Search Results -->
    <div class="space-y-8">
      <!-- Single Result -->
      <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md">
        <a href="#" class="block p-6 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white">How to Boost Your Productivity</h3>
          <p class="text-gray-600 dark:text-gray-300">Discover practical tips to increase your productivity in personal and professional life. Learn how time management can change your day.</p>
        </a>
      </div>

      <!-- Single Result -->
      <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md">
        <a href="#" class="block p-6 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white">Time Management Tips for Busy Professionals</h3>
          <p class="text-gray-600 dark:text-gray-300">Busy professionals need the best strategies to stay organized and avoid burnout. Here are some simple but effective time management tips.</p>
        </a>
      </div>

      <!-- Single Result -->
      <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md">
        <a href="#" class="block p-6 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white">The 2-Minute Rule for Increased Efficiency</h3>
          <p class="text-gray-600 dark:text-gray-300">This rule helps you stay focused and eliminate procrastination by tackling quick tasks immediately. Find out how to implement it effectively.</p>
        </a>
      </div>

      <!-- More Results -->
      <div class="text-center mt-8">
        <button class="px-6 py-3 bg-blue-600 text-white font-medium text-lg rounded-lg hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600">
          Show More Results
        </button>
      </div>
    </div>
  </div>
</section>


<section class="bg-gray-50 py-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-extrabold text-gray-800">Our Products</h2>
      <p class="mt-4 text-gray-600">Browse through our collection of amazing products designed to meet your needs.</p>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Product 1 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Product 1" class="rounded-t-lg w-full">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-2">Product Name 1</h3>
          <p class="text-gray-600 mb-4">This is a short description of the product, highlighting its key features and benefits.</p>
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-bold text-gray-800">$29.99</span>
            <a href="#" class="text-blue-600 hover:underline font-medium">Learn More →</a>
          </div>
          <a href="#" class="block text-center bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition">
            Buy Now
          </a>
        </div>
      </div>
      <!-- Product 2 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Product 2" class="rounded-t-lg w-full">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-2">Product Name 2</h3>
          <p class="text-gray-600 mb-4">This is a short description of the product, highlighting its key features and benefits.</p>
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-bold text-gray-800">$49.99</span>
            <a href="#" class="text-blue-600 hover:underline font-medium">Learn More →</a>
          </div>
          <a href="#" class="block text-center bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition">
            Buy Now
          </a>
        </div>
      </div>
      <!-- Product 3 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Product 3" class="rounded-t-lg w-full">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-2">Product Name 3</h3>
          <p class="text-gray-600 mb-4">This is a short description of the product, highlighting its key features and benefits.</p>
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-bold text-gray-800">$99.99</span>
            <a href="#" class="text-blue-600 hover:underline font-medium">Learn More →</a>
          </div>
          <a href="#" class="block text-center bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition">
            Buy Now
          </a>
        </div>
      </div>
      <!-- Product 4 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Product 4" class="rounded-t-lg w-full">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-2">Product Name 4</h3>
          <p class="text-gray-600 mb-4">This is a short description of the product, highlighting its key features and benefits.</p>
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-bold text-gray-800">$199.99</span>
            <a href="#" class="text-blue-600 hover:underline font-medium">Learn More →</a>
          </div>
          <a href="#" class="block text-center bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition">
            Buy Now
          </a>
        </div>
      </div>
      <!-- Product 5 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Product 5" class="rounded-t-lg w-full">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-2">Product Name 5</h3>
          <p class="text-gray-600 mb-4">This is a short description of the product, highlighting its key features and benefits.</p>
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-bold text-gray-800">$9.99</span>
            <a href="#" class="text-blue-600 hover:underline font-medium">Learn More →</a>
          </div>
          <a href="#" class="block text-center bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition">
            Buy Now
          </a>
        </div>
      </div>
      <!-- Product 6 -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition">
        <img src="https://shibajidebnath.com/wp-content/uploads/2024/04/Web-design.webp" alt="Product 6" class="rounded-t-lg w-full">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-2">Product Name 6</h3>
          <p class="text-gray-600 mb-4">This is a short description of the product, highlighting its key features and benefits.</p>
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-bold text-gray-800">$59.99</span>
            <a href="#" class="text-blue-600 hover:underline font-medium">Learn More →</a>
          </div>
          <a href="#" class="block text-center bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition">
            Buy Now
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="wrapper p-[15px]">
  <?php if (have_posts()) :
    while (have_posts()) : the_post(); ?>
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