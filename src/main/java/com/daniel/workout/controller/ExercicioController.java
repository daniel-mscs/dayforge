package com.daniel.workout.controller;

import com.daniel.workout.model.Exercicio;
import com.daniel.workout.repository.ExercicioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exercicios")
public class ExercicioController {

    @Autowired
    private ExercicioRepository repository;

    @GetMapping
    public List<Exercicio> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public Exercicio salvar(@RequestBody Exercicio exercicio) {
        return repository.save(exercicio);
    }

    @PutMapping("/{id}")
    public Exercicio atualizar(@PathVariable Long id, @RequestBody Exercicio exercicioAtualizado) {
        return repository.findById(id)
                .map(exercicio -> {
                    exercicio.setCarga(exercicioAtualizado.getCarga());
                    return repository.save(exercicio);
                }).orElseThrow(() -> new RuntimeException("Exercício não encontrado!"));
    }

}