describe('My First Test', () => {
  it('Does not do much!', () => {
    cy.visit('http://localhost:3000'); // change URL to match your dev URL
    cy
      .get('#object-address-autocomplete')
      .type('Gutenbergstrasse 14, 3011 Bern')
      .type('{uparrow}')
      .type('{enter}');
    cy.get('.leaflet-interactive').should('be.visible');
  });
});
