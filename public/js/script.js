// JavaScript to handle click and fetch feature details (simulate with timeout)
/*  <=========================================================---------==For home.ejs----------------------------======================---------------------> */
document.addEventListener('DOMContentLoaded', function() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('click', function() {

            const featureName = this.getAttribute('data-feature');
            
            if (featureName) {
             
                const targetURL = '/features/' + featureName;
                

                window.location.href = targetURL;
                
  
                
                console.log(`Navigating to feature: ${featureName}`);
            }
        });
    });
});




